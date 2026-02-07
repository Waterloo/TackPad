import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle } from "~/server/utils/drizzle";
import { generateItemId, ITEM_DIMENSIONS, checkOAuthEditPermission, loadBoardData, saveBoardData } from "~/server/utils/oauth";
import { fetchMetadata, isValidUrl } from "~/server/utils/extractUrlFromRequest";
import { findAvailablePosition } from "~/shared/board";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { board_id, url } = await readBody(event);

  if (!board_id || !url) {
    throw createError({ statusCode: 400, message: "board_id and url are required" });
  }

  if (!isValidUrl(url)) {
    throw createError({ statusCode: 400, message: "Invalid URL" });
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

    const position = findAvailablePosition(board.data, ITEM_DIMENSIONS.bookmark);

    // Fetch metadata
    const metadata = await fetchMetadata(url);

    const itemId = generateItemId("LINK");
    const bookmark = {
      id: itemId,
      kind: "link",
      content: {
        ...metadata.data,
        url,
      },
      x_position: position.x,
      y_position: position.y,
      width: ITEM_DIMENSIONS.bookmark.width,
      height: ITEM_DIMENSIONS.bookmark.height,
      displayName: metadata.data.title || "Bookmark",
    };

    board.data.items = board.data.items || {};
    board.data.items[itemId] = bookmark;

    await saveBoardData(db, board_id, board.data);

    return { 
      success: true, 
      item_id: itemId, 
      metadata: {
        title: metadata.data.title,
        description: metadata.data.description,
        image: metadata.data.image,
      }
    };
  } catch (error: any) {
    console.error("[OAuth Create Bookmark] Error:", error);
    throw createError({ statusCode: error.statusCode || 500, message: error.message || "Failed to create bookmark" });
  }
});
