import { defineEventHandler, readBody, createError } from "h3";
import { eq, and, sql } from "drizzle-orm";
import {
  BOARDS,
  BOARD_ACCESS,
  BoardAccessLevel,
  BoardAccessRole,
} from "~/server/database/schema";
import { getSSEServer } from "~/shared/board";
import type { Board } from "~/types/board";

export default defineEventHandler(async (event) => {
  // --- 1. Get Board ID ---
  const boardId = event.context.params?.id;
  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  // --- 2. Get User Profile ID (Mandatory for some actions) ---
  const userProfileId = event.context.session?.secure?.profileId;
  console.log(
    `[Save API - Board ${boardId}] User identified: ${userProfileId || "anonymous"}.`,
  );

  // --- 3. Read Request Body ---
  const body = await readBody(event);
  const boardData = body.data as Board["data"];
  if (boardData === undefined || boardData === null) {
    throw createError({
      statusCode: 400,
      message: "Board data (`data` property) is required in the request body",
    });
  }

  const db = useDrizzle();

  // --- 4. Fetch Existing Board Details ---
  let existingBoard;
  try {
    console.log(
      `[Save API - Board ${boardId}] Fetching existing board details...`,
    );
    existingBoard = await db.query.BOARDS.findFirst({
      where: boardId
        ? sql`lower(${BOARDS.board_id}) = lower(${boardId})`
        : undefined,
    });

    if (!existingBoard) {
      console.warn(
        `[Save API - Board ${boardId}] Board not found in database.`,
      );
      throw createError({
        statusCode: 404,
        message: `Board with ID ${boardId} not found. Cannot save.`,
      });
    }

    console.log(
      `[Save API - Board ${boardId}] Fetched details - Owner: ${existingBoard.owner_id}, Access Level: ${existingBoard.access_level}`,
    );
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(
      `[Save API - Board ${boardId}] Error fetching board details:`,
      error,
    );
    throw createError({
      statusCode: 500,
      message: `Failed to retrieve board details: ${error.message}`,
    });
  }

  // --- 5. Check Edit Permissions ---
  const canEdit = await checkEditPermissions(db, existingBoard, userProfileId);
  if (!canEdit) {
    console.warn(
      `[Save API - Board ${boardId}] Edit permission denied for user: ${userProfileId || "anonymous"}`,
    );
    throw createError({
      statusCode: 403,
      message: "You don't have permission to edit this board",
    });
  }

  // --- 6. Save/Update Board Data ---
  try {
    console.log(
      `[Save API - Board ${boardId}] Performing save/update operation...`,
    );
    await db
      .update(BOARDS)
      .set({
        data: boardData, // Only update the data field
      })
      .where(eq(BOARDS.board_id, boardId));

    console.log(
      `[Save API - Board ${boardId}] Board data saved/updated successfully.`,
    );
  } catch (error: any) {
    console.error(
      `[Save API - Board ${boardId}] Error saving board data:`,
      error,
    );
    throw createError({
      statusCode: 500,
      message: `Failed to save board data: ${error.message}`,
    });
  }

  // --- 7. Update Last Accessed Time (for authenticated users) ---
  if (userProfileId) {
    try {
      const updateResult = await db
        .update(BOARD_ACCESS)
        .set({
          last_accessed: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(
          and(
            eq(BOARD_ACCESS.board_id, boardId),
            eq(BOARD_ACCESS.profile_id, userProfileId),
          ),
        )
        .returning({ updatedId: BOARD_ACCESS.id });

      if (updateResult && updateResult.length > 0) {
        console.log(
          `[Save API - Board ${boardId}] Updated last_accessed for profile ${userProfileId}.`,
        );
      } else {
        // Create an access record if it doesn't exist yet
        console.log(
          `[Save API - Board ${boardId}] No access record found, creating one...`,
        );

        // Determine appropriate role
        let role = BoardAccessRole.VIEWER;
        if (existingBoard.owner_id === userProfileId) {
          role = BoardAccessRole.OWNER;
        } else if (existingBoard.access_level === BoardAccessLevel.PUBLIC) {
          role = BoardAccessRole.EDITOR; // In public boards, anyone can edit
        }

        await db
          .insert(BOARD_ACCESS)
          .values({
            board_id: boardId,
            profile_id: userProfileId,
            role: role,
            created_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          })
          .onConflictDoNothing();
      }
    } catch (error: any) {
      console.error(
        `[Save API - Board ${boardId}] Error updating BOARD_ACCESS (non-critical):`,
        error,
      );
      // Continue execution - this is non-critical
    }
  }

  // --- 8. Notify via SSE ---
  try {
    const server = getSSEServer(boardId);
    server.pathname = "/send";
    await fetch(server.toString(), {
      method: "POST",
      body: JSON.stringify({
        room: boardId,
        sender: userProfileId || "anonymous",
      }),
      headers: { "content-type": "application/json" },
    });
    console.log(`[Save API - Board ${boardId}] SSE notification sent.`);
  } catch (sseError) {
    console.error(
      `[Save API - Board ${boardId}] Failed to send SSE notification:`,
      sseError,
    );
  }

  // --- 9. Return Success ---
  return {
    success: true,
    message: `Board ${boardId} saved successfully.`,
  };
});

/**
 * Checks if a user has permission to edit a board
 */
async function checkEditPermissions(
  db: any,
  board: any,
  profileId: string | undefined,
): Promise<boolean> {
  // If the user is the owner, they always have edit rights
  if (profileId && board.owner_id === profileId) {
    return true;
  }

  // Check edit permissions based on access level
  switch (board.access_level) {
    case BoardAccessLevel.PUBLIC:
      // Anyone can edit public boards
      return true;

    case BoardAccessLevel.LIMITED_EDIT:
      // Anonymous users cannot edit LIMITED_EDIT boards
      if (!profileId) return false;

      // Authenticated users need EDITOR or OWNER role
      const editorAccessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, board.board_id),
          eq(BOARD_ACCESS.profile_id, profileId),
          sql`${BOARD_ACCESS.role} IN ('editor', 'owner')`,
        ),
      });
      return !!editorAccessRecord;

    case BoardAccessLevel.PRIVATE_SHARED:
      // Anonymous users cannot edit PRIVATE_SHARED boards
      if (!profileId) return false;

      // Need to check user's role
      const privateAccessRecord = await db.query.BOARD_ACCESS.findFirst({
        where: and(
          eq(BOARD_ACCESS.board_id, board.board_id),
          eq(BOARD_ACCESS.profile_id, profileId),
        ),
      });

      // Can edit if role is EDITOR or OWNER
      return (
        privateAccessRecord &&
        (privateAccessRecord.role === BoardAccessRole.EDITOR ||
          privateAccessRecord.role === BoardAccessRole.OWNER)
      );

    case BoardAccessLevel.VIEW_ONLY:
      // Only admin/owner can edit VIEW_ONLY boards
      // We already checked if user is owner above
      return false;

    case BoardAccessLevel.ADMIN_ONLY:
      // Only admin/owner can edit ADMIN_ONLY boards
      // We already checked if user is owner above
      return false;

    default:
      console.warn(`[Save API] Unknown access level: ${board.access_level}`);
      return false; // Default to denying edit access
  }
}
