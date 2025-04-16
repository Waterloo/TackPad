import { BOARDS, BoardAccessLevel } from "~/server/database/schema";
import { useDrizzle, eq } from "~/server/utils/drizzle";

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

  // Update the board access level
  await db
    .update(BOARDS)
    .set({ access_level: body.accessLevel })
    .where(eq(BOARDS.board_id, boardId));

  // Return success with details
  return {
    success: true,
    message: `Board access level updated to ${body.accessLevel}`,
    boardId,
    accessLevel: body.accessLevel,
  };
});
