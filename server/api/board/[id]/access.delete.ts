// server/api/boards/[boardId]/access/[profileId].delete.ts
import { BOARD_ACCESS, BOARDS } from "~/server/database/schema";
import { useDrizzle, eq, and } from "~/server/utils/drizzle";

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
  const body = await readBody(event);
  const targetProfileId = body.profileId;

  if (!boardId || !targetProfileId) {
    throw createError({
      statusCode: 400,
      message: "Board ID and profile ID are required",
    });
  }

  // Check if current user has permission (must be owner or the user themselves)
  const board = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!board) {
    throw createError({
      statusCode: 404,
      message: "Board not found",
    });
  }

  const isOwner = board.owner_id === currentProfileId;
  const isSelfRemoval = targetProfileId === currentProfileId;

  // Prevent board owner from removing themselves
  if (isSelfRemoval && board.owner_id === currentProfileId) {
    throw createError({
      statusCode: 400,
      message:
        "Board owners cannot remove themselves. Transfer ownership first or delete the board.",
    });
  }

  if (!isOwner && !isSelfRemoval) {
    throw createError({
      statusCode: 403,
      message: "You don't have permission to remove this user's access",
    });
  }

  // Check if user has access to this board
  const existingAccess = await db.query.BOARD_ACCESS.findFirst({
    where: and(
      eq(BOARD_ACCESS.board_id, boardId),
      eq(BOARD_ACCESS.profile_id, targetProfileId),
    ),
  });

  if (!existingAccess) {
    throw createError({
      statusCode: 404,
      message: "The specified user does not have access to this board",
    });
  }

  // Remove access
  await db.delete(BOARD_ACCESS).where(eq(BOARD_ACCESS.id, existingAccess.id));

  // Return success with details
  return {
    success: true,
    message: `User access to board has been removed`,
    boardId,
    profileId: targetProfileId,
  };
});
