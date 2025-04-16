import {
  BOARD_ACCESS,
  BOARDS,
  BoardAccessRole,
} from "~/server/database/schema";
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

  const isOwner = board.owner_id === currentProfileId;

  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: "Only the board owner can modify access roles",
    });
  }

  // Prevent changing your own role if you're the owner
  if (targetProfileId === currentProfileId) {
    throw createError({
      statusCode: 400,
      message: "You cannot modify your own role as the board owner",
    });
  }

  if (!body.role) {
    throw createError({
      statusCode: 400,
      message: "Role is required",
    });
  }

  // Validate the role
  if (!Object.values(BoardAccessRole).includes(body.role)) {
    throw createError({
      statusCode: 400,
      message: "Invalid role specified",
    });
  }

  // Get existing access
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

  // Update the role
  await db
    .update(BOARD_ACCESS)
    .set({
      role: body.role,
      last_accessed: new Date().toISOString(),
    })
    .where(eq(BOARD_ACCESS.id, existingAccess.id));

  // Return success with details
  return {
    success: true,
    message: `User access role updated to ${body.role}`,
    boardId,
    profileId: targetProfileId,
    role: body.role,
  };
});
