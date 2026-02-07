import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle } from "~/server/utils/drizzle";
import { checkOAuthEditPermission, loadBoardData, saveBoardData } from "~/server/utils/oauth";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { board_id, item_id, title, description } = await readBody(event);

  if (!board_id || !item_id) {
    throw createError({ statusCode: 400, message: "board_id and item_id are required" });
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
    if (item.kind !== "link") {
      throw createError({ statusCode: 400, message: "Item is not a bookmark" });
    }

    if (title !== undefined) {
      item.content.title = title;
    }
    if (description !== undefined) {
      item.content.description = description;
    }

    await saveBoardData(db, board_id, board.data);

    return { success: true, item_id };
  } catch (error: any) {
    console.error("[OAuth Update Bookmark] Error:", error);
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Failed to update bookmark" });
  }
});
