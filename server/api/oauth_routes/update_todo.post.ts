import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle } from "~/server/utils/drizzle";
import { customAlphabet } from "nanoid";
import { checkOAuthEditPermission, loadBoardData, saveBoardData } from "~/server/utils/oauth";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { board_id, item_id, action, task_id, content, completed } = await readBody(event);

  if (!board_id || !item_id || !action) {
    throw createError({ statusCode: 400, message: "board_id, item_id, and action are required" });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;

    const canEdit = await checkOAuthEditPermission(db, board_id, profileId);
    if (!canEdit) {
      throw createError({ statusCode: 403, message: "No edit permission for this board" });
    }

    const board = await loadBoardData(db, board_id);
    if (!board || !board.data.items?.[item_id]) {
      throw createError({ statusCode: 404, message: "Board or item not found" });
    }

    const item = board.data.items[item_id];
    if (item.kind !== "todo") {
      throw createError({ statusCode: 400, message: "Item is not a todo list" });
    }

    const todo = item;

    switch (action) {
      case "add_task": {
        if (!content) throw createError({ statusCode: 400, message: "content required for add_task" });
        const newTaskId = String(todo.content.tasks.length + 1);
        todo.content.tasks.push({ task_id: newTaskId, content, completed: false });
        break;
      }
      case "toggle_task": {
        if (!task_id) throw createError({ statusCode: 400, message: "task_id required for toggle_task" });
        const task = todo.content.tasks.find((t: any) => t.task_id === task_id);
        if (!task) throw createError({ statusCode: 404, message: "Task not found" });
        task.completed = !task.completed;
        break;
      }
      case "edit_task": {
        if (!task_id || !content) throw createError({ statusCode: 400, message: "task_id and content required for edit_task" });
        const task = todo.content.tasks.find((t: any) => t.task_id === task_id);
        if (!task) throw createError({ statusCode: 404, message: "Task not found" });
        task.content = content;
        break;
      }
      case "delete_task": {
        if (!task_id) throw createError({ statusCode: 400, message: "task_id required for delete_task" });
        todo.content.tasks = todo.content.tasks.filter((t: any) => t.task_id !== task_id);
        break;
      }
      case "update_title": {
        if (!content) throw createError({ statusCode: 400, message: "content (title) required for update_title" });
        todo.content.title = content;
        break;
      }
      default:
        throw createError({ statusCode: 400, message: "Invalid action" });
    }

    await saveBoardData(db, board_id, board.data);

    return { success: true, item_id };
  } catch (error: any) {
    console.error("[OAuth Update Todo] Error:", error);
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Failed to update todo" });
  }
});
