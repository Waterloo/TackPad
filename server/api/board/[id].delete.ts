import { BOARDS, BOARD_ACCESS, USER_UPLOADS } from "~/server/database/schema";
import { useDrizzle } from "~/server/utils/drizzle";
import { eq } from "drizzle-orm";
import { defineEventHandler, createError, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  // 1. Get Profile ID from context set by the auth middleware
  const profileId = event.context.session?.secure?.profileId as
    | string
    | undefined;

  if (!profileId) {
    console.error(
      `[Delete Board API] Critical: Reached handler for board ${event.context.params?.id} without profileId in context. Middleware issue?`,
    );
    throw createError({
      statusCode: 401,
      message: "User identification is missing. Unable to authorize.",
    });
  }

  // 2. Get Board ID from URL parameters
  const boardId = decodeURIComponent(event.context.params?.id || "");
  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  const db = useDrizzle(); // Assuming useDrizzle initializes the D1 binding correctly

  try {
    // 3. Fetch the board to check existence and get the owner_id (outside the batch)
    const boardData = await db
      .select({ owner_id: BOARDS.owner_id })
      .from(BOARDS)
      .where(eq(BOARDS.board_id, boardId))
      .limit(1);

    if (boardData.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Board not found",
      });
    }

    const board = boardData[0];

    // 4. Verify ownership
    if (board.owner_id !== profileId) {
      console.warn(
        `[Delete Board API] Unauthorized attempt: User ${profileId} tried to delete board ${boardId} owned by ${board.owner_id}.`,
      );
      throw createError({
        statusCode: 403,
        message: "Forbidden: You do not have permission to delete this board.",
      });
    }

    // 5. Perform deletion using Drizzle's batch operation, leveraging D1's batch atomicity
    //    Construct the delete statements first.
    const deleteUploadsStmt = db
      .delete(USER_UPLOADS)
      .where(eq(USER_UPLOADS.board_id, boardId));
    const deleteAccessStmt = db
      .delete(BOARD_ACCESS)
      .where(eq(BOARD_ACCESS.board_id, boardId));
    const deleteBoardStmt = db
      .delete(BOARDS)
      .where(eq(BOARDS.board_id, boardId));
    // Optional: Add BOARD_SETTINGS delete statement if needed
    // const deleteSettingsStmt = db.delete(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.board_id, boardId));

    // Execute all delete statements atomically using db.batch()
    // Note: Pass the prepared statements directly into the array.
    console.log(
      `[Delete Board API] Preparing batch delete for board ${boardId}`,
    );
    const batchResult = await db.batch([
      deleteUploadsStmt,
      deleteAccessStmt,
      deleteBoardStmt,
      // deleteSettingsStmt, // Include if needed
    ]);

    // D1 batch usually returns an array of D1Result objects. You might check them for errors,
    // though Drizzle/D1 should throw if the batch itself fails.
    console.log(
      `[Delete Board API] Batch delete executed for board ${boardId}. Result length: ${batchResult.length}`,
    );

    // 6. Return success response
    console.log(
      `[Delete Board API] Board ${boardId} deleted successfully by owner ${profileId}.`,
    );
    setResponseStatus(event, 200);
    return {
      success: true,
      message: "Board deleted successfully",
    };
  } catch (error: any) {
    // Re-throw errors with specific status codes (like 400, 401, 403, 404)
    if (error.statusCode) {
      throw error;
    }

    // Handle unexpected database or other internal errors (including potential D1 batch errors)
    console.error(
      `[Delete Board API] Error deleting board ${boardId} for user ${profileId} (potentially during batch):`,
      error,
    );
    // Check if it's a D1 specific error message for clarity
    if (
      error.message?.includes("D1_ERROR") ||
      error.cause?.message?.includes("D1_ERROR")
    ) {
      throw createError({
        statusCode: 500,
        message: `Failed to delete board due to a database batch error: ${error.message}`,
        cause: error,
      });
    }
    throw createError({
      statusCode: 500,
      message: "Failed to delete board due to an internal server error.",
      cause: error, // Include original error cause if possible
    });
  }
});
