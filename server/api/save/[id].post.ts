import { defineEventHandler, readBody, createError } from "h3";
import { eq, and, sql } from "drizzle-orm";
import { BOARDS, BOARD_ACCESS } from "~/server/database/schema"; // Ensure BOARD_ACCESS is imported if used
import { getSSEServer } from "~/shared/board";
import type { Board } from "~/types/board"; // Keep type import if needed elsewhere

export default defineEventHandler(async (event) => {
  // --- 1. Get Board ID ---
  const boardId = event.context.params?.id;
  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  // --- 2. Get User Profile ID (Mandatory) ---
  const userProfileId = event.context.session?.secure?.profileId;
  if (!userProfileId) {
    console.warn(
      `[Save API - Board ${boardId}] Blocking save: Could not identify user (profileId is null).`,
    );
    throw createError({
      statusCode: 401,
      message: "User identification failed. Cannot save board.",
    });
  }
  console.log(
    `[Save API - Board ${boardId}] User identified: ${userProfileId}.`,
  );

  // --- 3. Read Request Body ---
  const body = await readBody(event);
  const boardData = body.data as Board["data"]; // Extract just the data part we want to update
  if (boardData === undefined || boardData === null) {
    throw createError({
      statusCode: 400,
      message: "Board data (`data` property) is required in the request body",
    });
  }

  const db = useDrizzle();

  // --- 4. Fetch Existing Board Details (owner_id, access_level) ---
  let existingOwnerId: string | null = null;
  let existingAccessLevel: string | null = null;

  try {
    console.log(
      `[Save API - Board ${boardId}] Fetching existing board details...`,
    );
    const existingBoard = await db.query.BOARDS.findFirst({
      where: eq(BOARDS.board_id, boardId),
      columns: {
        owner_id: true,
        access_level: true,
      },
    });

    if (!existingBoard) {
      // If the board doesn't exist, we cannot save to it via this endpoint.
      console.warn(
        `[Save API - Board ${boardId}] Board not found in database.`,
      );
      throw createError({
        statusCode: 404, // Not Found
        message: `Board with ID ${boardId} not found. Cannot save.`,
      });
    }

    existingOwnerId = existingBoard.owner_id;
    existingAccessLevel = existingBoard.access_level;

    if (!existingOwnerId || !existingAccessLevel) {
      // This case might indicate data integrity issues if owner/access should always exist
      console.error(
        `[Save API - Board ${boardId}] Found board but missing owner_id or access_level in DB! Owner: ${existingOwnerId}, Access: ${existingAccessLevel}`,
      );
      // Decide how critical this is. For now, let's throw an error.
      throw createError({
        statusCode: 500,
        message: `Board ${boardId} data is incomplete in the database (missing owner or access level).`,
      });
    }

    console.log(
      `[Save API - Board ${boardId}] Fetched details - Owner: ${existingOwnerId}, Access Level: ${existingAccessLevel}`,
    );
  } catch (error: any) {
    // Handle specific 404/500 errors thrown above, re-throw others
    if (error.statusCode === 404 || error.statusCode === 500) {
      throw error; // Re-throw the specific error
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

  // --- 5. Save/Update Board Data (Now includes fetched owner/access level) ---
  try {
    console.log(
      `[Save API - Board ${boardId}] Performing save/update operation...`,
    );
    await db
      .insert(BOARDS)
      .values({
        board_id: boardId, // From param
        owner_id: existingOwnerId, // Fetched value
        access_level: existingAccessLevel, // Fetched value
        data: boardData, // From request body
      })
      .onConflictDoUpdate({
        target: BOARDS.board_id,
        // Only update the 'data' field when the board already exists.
        // Do NOT update owner_id or access_level here unless specifically intended.
        set: {
          data: boardData,
        },
      });
    console.log(
      `[Save API - Board ${boardId}] Board data saved/updated successfully for profile ${userProfileId}.`,
    );
  } catch (error: any) {
    console.error(
      `[Save API - Board ${boardId}] Error saving board data for profile ${userProfileId}:`,
      error,
    );
    throw createError({
      statusCode: 500,
      message: `Failed to save board data: ${error.message}`,
    });
  }

  // --- 6. Update Last Accessed Time (Requires profileId, checked earlier) ---
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
      console.warn(
        `[Save API - Board ${boardId}] Saved board data, but no existing BOARD_ACCESS record found to update last_accessed for profile ${userProfileId}.`,
      );
    }
  } catch (error: any) {
    console.error(
      `[Save API - Board ${boardId}] Error updating BOARD_ACCESS for profile ${userProfileId} (board data WAS saved):`,
      error,
    );
    // Log error but don't fail the request
  }

  // --- 7. Notify via SSE ---
  try {
    const server = getSSEServer(boardId);
    server.pathname = "/send";
    await fetch(server.toString(), {
      method: "POST",
      body: JSON.stringify({ room: boardId, sender: userProfileId }),
      headers: { "content-type": "application/json" },
    });
    console.log(
      `[Save API - Board ${boardId}] SSE notification sent by sender ${userProfileId}.`,
    );
  } catch (sseError) {
    console.error(
      `[Save API - Board ${boardId}] Failed to send SSE notification:`,
      sseError,
    );
  }

  // --- 8. Return Success ---
  return {
    success: true,
    message: `Board ${boardId} saved successfully.`,
  };
});
