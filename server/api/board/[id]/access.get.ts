// server/api/boards/[boardId]/access.get.ts
import { PROFILE, BOARD_ACCESS, BOARDS } from "~/server/database/schema";
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

  // Check if the board exists and if current user has access
  const board = await db.query.BOARDS.findFirst({
    where: eq(BOARDS.board_id, boardId),
  });

  if (!board) {
    throw createError({
      statusCode: 404,
      message: "Board not found",
    });
  }

  const userAccess = await db.query.BOARD_ACCESS.findFirst({
    where: and(
      eq(BOARD_ACCESS.board_id, boardId),
      eq(BOARD_ACCESS.profile_id, currentProfileId),
    ),
  });

  const isOwner = board.owner_id === currentProfileId;

  // If user is not owner or doesn't have access, check if the board is public
  if (
    !isOwner &&
    !userAccess &&
    board.access_level !== "public" &&
    board.access_level !== "view_only"
  ) {
    throw createError({
      statusCode: 403,
      message: "You don't have permission to view this board's access list",
    });
  }

  // Get all users with access to this board
  const accessList = await db
    .select({
      id: BOARD_ACCESS.id,
      profileId: BOARD_ACCESS.profile_id,
      role: BOARD_ACCESS.role,
      username: PROFILE.username,
      firstName: PROFILE.firstName,
      lastAccessed: BOARD_ACCESS.last_accessed,
    })
    .from(BOARD_ACCESS)
    .leftJoin(PROFILE, eq(BOARD_ACCESS.profile_id, PROFILE.id))
    .where(eq(BOARD_ACCESS.board_id, boardId));

  // Add the owner if not already in the list
  const ownerInList = accessList.some(
    (user) => user.profileId === board.owner_id,
  );

  if (!ownerInList) {
    const ownerProfile = await db.query.PROFILE.findFirst({
      where: eq(PROFILE.id, board.owner_id),
    });

    if (ownerProfile) {
      accessList.push({
        id: 0, // placeholder
        profileId: ownerProfile.id,
        role: "owner", // Owner role
        username: ownerProfile.username,
        firstName: ownerProfile.firstName,
        lastAccessed: null, // The owner might not have accessed through BOARD_ACCESS
      });
    }
  }

  return {
    boardId,
    accessLevel: board.access_level,
    owner: board.owner_id,
    accessList,
    currentUserProfileId: currentProfileId,
  };
});
