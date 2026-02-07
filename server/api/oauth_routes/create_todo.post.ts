import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle } from "~/server/utils/drizzle";
import { generateItemId, ITEM_DIMENSIONS, checkOAuthEditPermission, loadBoardData, saveBoardData } from "~/server/utils/oauth";
import { findAvailablePosition } from "~/shared/board";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { board_id, title, tasks } = await readBody(event);

  if (!board_id || !title) {
    throw createError({ statusCode: 400, message: "board_id and title are required" });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;

    const canEdit = await checkOAuthEditPermission(db, board_id, profileId);
    if (!canEdit) {
      throw createError({ statusCode: 403, message: "No edit permission for this board" });
    }

    const board = await loadBoardData(db, board_id);
    if (!board) {
      throw createError({ statusCode: 404, message: "Board not found" });
    }

    const position = findAvailablePosition(board.data, ITEM_DIMENSIONS.todo);

    const itemId = generateItemId("TODO");
    const todoTasks = tasks?.length > 0 
      ? tasks.map((t: any, i: number) => ({ task_id: String(i + 1), content: t.content, completed: t.completed || false }))
      : [{ task_id: "1", content: "New task", completed: false }];

    const todo = {
      id: itemId,
      kind: "todo",
      content: {
        title,
        tasks: todoTasks,
      },
      x_position: position.x,
      y_position: position.y,
      width: ITEM_DIMENSIONS.todo.width,
      height: ITEM_DIMENSIONS.todo.height,
      displayName: "Todo",
    };

    board.data.items = board.data.items || {};
    board.data.items[itemId] = todo;

    await saveBoardData(db, board_id, board.data);

    return { success: true, item_id: itemId };
  } catch (error: any) {
    console.error("[OAuth Create Todo] Error:", error);
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Failed to create todo" });
  }
});
