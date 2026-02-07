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

  const { board_id, text, color } = await readBody(event);

  if (!board_id || !text) {
    throw createError({ statusCode: 400, message: "board_id and text are required" });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;

    // Check edit permission
    const canEdit = await checkOAuthEditPermission(db, board_id, profileId);
    if (!canEdit) {
      throw createError({ statusCode: 403, message: "No edit permission for this board" });
    }

    // Load board
    const board = await loadBoardData(db, board_id);
    if (!board) {
      throw createError({ statusCode: 404, message: "Board not found" });
    }

    // Find position
    const position = findAvailablePosition(board.data, ITEM_DIMENSIONS.note);

    // Create note
    const itemId = generateItemId("NOTE");
    const note = {
      id: itemId,
      kind: "note",
      content: {
        text,
        color: color || "#FFD700",
      },
      x_position: position.x,
      y_position: position.y,
      width: ITEM_DIMENSIONS.note.width,
      height: ITEM_DIMENSIONS.note.height,
      displayName: "Note",
    };

    // Add to board
    board.data.items = board.data.items || {};
    board.data.items[itemId] = note;

    await saveBoardData(db, board_id, board.data);

    return { success: true, item_id: itemId };
  } catch (error: any) {
    console.error("[OAuth Create Note] Error:", error);
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Failed to create note" });
  }
});
