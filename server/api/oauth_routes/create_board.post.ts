import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle, tables, eq } from "~/server/utils/drizzle";
import { getRandomBoardName } from "~/server/utils/boardNames";
import { generateBoardId, generateItemId } from "~/server/utils/oauth";
import { BOARD_ACCESS, BoardAccessRole } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }

  const oauth = event.context.oauth;
  if (!oauth || !oauth.profileId) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - OAuth context missing",
    });
  }

  const body = await readBody(event);
  const { title } = body;

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;
    const boardId = generateBoardId();
    const boardTitle = title?.trim() || getRandomBoardName();
    const now = new Date().toISOString();

    // Create default items
    const stickyNoteId = generateItemId("STICKY");
    const todoItemId = generateItemId("TODO");

    const defaultItems: Record<string, any> = {
      [stickyNoteId]: {
        id: stickyNoteId,
        kind: "note",
        content: {
          text: ` <h1>Welcome to your board!</h1>
    <p>Try adding more notes and todo lists.</p>
    <h2>Quick Tips:</h2>
    <ul>
      <li>
        <p>Double-click to edit notes</p>
      </li>
      </ul>`,
          color: "#FFD700",
        },
        x_position: 100,
        y_position: 48,
        width: 300,
        height: 300,
        displayName: "Note 1",
      },
      [todoItemId]: {
        id: todoItemId,
        kind: "todo",
        content: {
          title: "Getting Started",
          tasks: [
            { task_id: "1", content: "Add a new note", completed: false },
            { task_id: "2", content: "Create a todo list", completed: false },
            { task_id: "3", content: "Try panning and zooming", completed: false },
          ],
        },
        x_position: 420,
        y_position: 48,
        width: 300,
        height: 400,
        displayName: "Todo 1",
      },
    };

    // Create board
    await db.insert(tables.BOARDS).values({
      board_id: boardId,
      owner_id: profileId,
      access_level: "public",
      data: {
        title: boardTitle,
        items: defaultItems,
      },
    });

    // Create owner access record
    await db.insert(BOARD_ACCESS).values({
      board_id: boardId,
      profile_id: profileId,
      role: BoardAccessRole.OWNER,
      created_at: now,
      last_accessed: now,
    });

    return {
      success: true,
      board_id: boardId,
      title: boardTitle,
    };
  } catch (error: any) {
    console.error("[OAuth Create Board] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to create board",
    });
  }
});
