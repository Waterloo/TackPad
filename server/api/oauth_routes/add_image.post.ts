import { defineEventHandler, createError, readFormData } from "h3";
import { useDrizzle, tables, eq, and, sql } from "~/server/utils/drizzle";
import {
  generateItemId,
  ITEM_DIMENSIONS,
  checkOAuthEditPermission,
  loadBoardData,
  saveBoardData,
  getExtension,
} from "~/server/utils/oauth";
import { findAvailablePosition } from "~/shared/board";
import { nanoid } from "nanoid";
import { USER_UPLOADS, USAGE_QUOTA } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, message: "Method not allowed" });
  }

  const oauth = event.context.oauth;
  if (!oauth?.profileId) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const body = await readFormData(event);
  const board_id = body.get("board_id") as string;
  const title = (body.get("title") as string) || "Image";
  const file = body.get("file") as File;

  if (!board_id || !file) {
    throw createError({
      statusCode: 400,
      message: "board_id and file are required",
    });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;

    const canEdit = await checkOAuthEditPermission(db, board_id, profileId);
    if (!canEdit) {
      throw createError({
        statusCode: 403,
        message: "No edit permission for this board",
      });
    }

    const board = await loadBoardData(db, board_id);
    if (!board) {
      throw createError({ statusCode: 404, message: "Board not found" });
    }

    // Upload file
    const fileName = `${nanoid()}.${getExtension(file)}`;
    await useStorage("tackpad").setItemRaw(
      fileName,
      Buffer.from(await file.arrayBuffer()),
    );

    const fileUrl = `https://assets.tackpad.xyz/${fileName}`;

    // Track upload
    await db.insert(USER_UPLOADS).values({
      file_url: fileUrl,
      profile_id: profileId,
      board_id,
      file_name: fileName,
      file_type: file.type || "image/jpeg",
      file_size: file.size,
      created_at: new Date().toISOString(),
    });

    // Update quota
    await db
      .insert(USAGE_QUOTA)
      .values({
        profile_id: profileId,
        consumption: file.size,
        updated_at: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: USAGE_QUOTA.profile_id,
        set: {
          consumption: sql`${USAGE_QUOTA.consumption} + ${file.size}`,
        },
      });

    // Find position and create image item
    const position = findAvailablePosition(board.data, ITEM_DIMENSIONS.image);
    const itemId = generateItemId("IMG");

    const image = {
      id: itemId,
      kind: "image",
      title,
      content: {
        url: fileUrl,
        status: "success" as const,
      },
      x_position: position.x,
      y_position: position.y,
      width: ITEM_DIMENSIONS.image.width,
      height: ITEM_DIMENSIONS.image.height,
      displayName: title,
    };

    board.data.items = board.data.items || {};
    board.data.items[itemId] = image;

    await saveBoardData(db, board_id, board.data);

    return { success: true, item_id: itemId, url: fileUrl };
  } catch (error: any) {
    console.error("[OAuth Add Image] Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to add image",
    });
  }
});
