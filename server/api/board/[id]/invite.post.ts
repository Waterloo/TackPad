// server/api/boards/[boardId]/invite.post.ts
import {
  PROFILE,
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

  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: "Board ID is required",
    });
  }

  // Check if current user has permission to invite others (must be owner or editor)
  const userAccess = await db.query.BOARD_ACCESS.findFirst({
    where: and(
      eq(BOARD_ACCESS.board_id, boardId),
      eq(BOARD_ACCESS.profile_id, currentProfileId),
    ),
  });

  const boardInfo = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!boardInfo) {
    throw createError({
      statusCode: 404,
      message: "Board not found",
    });
  }

  // Check if user is owner or has editor access
  const isOwner = boardInfo.owner_id === currentProfileId;
  const hasEditAccess =
    userAccess?.role === BoardAccessRole.EDITOR ||
    userAccess?.role === BoardAccessRole.OWNER;

  if (!isOwner && !hasEditAccess) {
    throw createError({
      statusCode: 403,
      message: "You don't have permission to invite users to this board",
    });
  }

  const body = await readBody(event);

  if (!body.username || !body.role) {
    throw createError({
      statusCode: 400,
      message: "Username and role are required",
    });
  }

  // Validate the role
  if (!Object.values(BoardAccessRole).includes(body.role)) {
    throw createError({
      statusCode: 400,
      message: "Invalid role specified",
    });
  }

  // Only owners can assign owner role
  if (body.role === BoardAccessRole.OWNER && !isOwner) {
    throw createError({
      statusCode: 403,
      message: "Only the board owner can assign owner role",
    });
  }

  // Find the user by username
  const userToInvite = await db.query.PROFILE.findFirst({
    where: eq(PROFILE.username, body.username),
  });

  if (!userToInvite) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Check if user already has access to this board
  const existingAccess = await db.query.BOARD_ACCESS.findFirst({
    where: and(
      eq(BOARD_ACCESS.board_id, boardId),
      eq(BOARD_ACCESS.profile_id, userToInvite.id),
    ),
  });

  const now = new Date().toISOString();

  if (existingAccess) {
    // Update existing access
    await db
      .update(BOARD_ACCESS)
      .set({
        role: body.role,
        last_accessed: now,
      })
      .where(eq(BOARD_ACCESS.id, existingAccess.id));
  } else {
    // Create new access record
    await db.insert(BOARD_ACCESS).values({
      board_id: boardId,
      profile_id: userToInvite.id,
      role: body.role,
      created_at: now,
      last_accessed: now,
    });
  }

  // Return success with details
  return {
    success: true,
    message: `User ${body.username} has been given ${body.role} access to the board`,
    boardId,
    username: body.username,
    role: body.role,
  };
});
