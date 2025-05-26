import {
  BOARDS,
  BOARD_ACCESS,
  BoardAccessLevel,
} from "~/server/database/schema";
import { useDrizzle, eq, and, ne } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  const currentProfileId = event.context.session?.secure?.profileId;

  if (!currentProfileId) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  const db = useDrizzle();
  const boardId = event.context.params?.id;

  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  // Check if current user is board owner
  const board = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!board) {
    throw createError({
      statusCode: 404,
      message: "Board not found",
    });
  }

  if (board.owner_id !== currentProfileId) {
    throw createError({
      statusCode: 403,
      message: "Only the board owner can change access level",
    });
  }

  const body = await readBody(event);

  if (!body.accessLevel) {
    throw createError({
      statusCode: 400,
      message: "Access level is required",
    });
  }

  // Validate the access level
  if (!Object.values(BoardAccessLevel).includes(body.accessLevel)) {
    throw createError({
      statusCode: 400,
      message: "Invalid access level specified",
    });
  }
  const newAccessLevel = body.accessLevel;
  const resetCurrentUserAccess = body.removeUserAccess ?? false;

  // --- Operation 2: Update the board access level ---
  try {
    await db
      .update(BOARDS)
      .set({ access_level: newAccessLevel })
      .where(eq(BOARDS.board_id, boardId));
  } catch (error) {
    console.error("Failed to update board access level:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to update board access level",
    });
  }

  // --- Operation 3: Conditionally Clean up BOARD_ACCESS ---
  // This runs *after* the board level is successfully updated.
  if (
    newAccessLevel === BoardAccessLevel.ADMIN_ONLY ||
    resetCurrentUserAccess === true
  ) {
    console.log(
      `Board ${boardId}  Attempting to remove non-owner access entries.`,
    );
    try {
      const deleteResult = await db
        .delete(BOARD_ACCESS)
        .where(
          and(
            eq(BOARD_ACCESS.board_id, boardId),
            // Ensure we do not delete the owner if they have an explicit entry
            ne(BOARD_ACCESS.profile_id, board.owner_id),
          ),
        )
        .returning({ id: BOARD_ACCESS.id }); // Use returning or similar to check rows affected if your driver supports it easily, otherwise just execute.

      // Cloudflare D1 might return meta.changes or similar instead of rowCount directly
      // Adapt based on what useDrizzle + D1 adapter provides
      console.log(`Removed access entries potentially. Result:`, deleteResult); // Log the actual result object
    } catch (error) {
      // Log the error, but don't throw - the primary operation succeeded.
      // The permission logic elsewhere MUST handle this inconsistency.
      console.error(
        `Failed to clean up BOARD_ACCESS for board ${boardId} after setting ADMIN_ONLY. Stale entries might exist, but permission logic should prevent access. Error:`,
        error,
      );
      // You could potentially flag this board for a later cleanup job if needed.
    }
  }

  // Return success - the primary goal (updating level) was achieved.
  return {
    success: true,
    message: `Board access level updated to ${newAccessLevel}. Associated access cleanup attempted if necessary.`,
    boardId,
    accessLevel: newAccessLevel,
  };
});
