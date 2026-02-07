import { defineEventHandler } from "h3";
import { useDrizzle, tables, eq, or, and } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  // OAuth middleware should have already validated the token and set event.context.oauth

  const oauth = event.context.oauth;
  if (!oauth || !oauth.profileId) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - OAuth context missing",
    });
  }

  try {
    const db = useDrizzle();
    const profileId = oauth.profileId;

    // Get boards where user is owner or has access
    const boards = await db
      .select({
        board_id: tables.BOARDS.board_id,
        owner_id: tables.BOARDS.owner_id,
        access_level: tables.BOARDS.access_level,
        data: tables.BOARDS.data,
        role: tables.BOARD_ACCESS.role,
        last_accessed: tables.BOARD_SETTINGS.last_accessed,
      })
      .from(tables.BOARDS)
      .leftJoin(
        tables.BOARD_ACCESS,
        and(
          eq(tables.BOARD_ACCESS.board_id, tables.BOARDS.board_id),
          eq(tables.BOARD_ACCESS.profile_id, profileId),
        ),
      )
      .leftJoin(
        tables.BOARD_SETTINGS,
        eq(tables.BOARD_SETTINGS.board_id, tables.BOARDS.board_id),
      )
      .where(
        or(
          eq(tables.BOARDS.owner_id, profileId),
          eq(tables.BOARD_ACCESS.profile_id, profileId),
        ),
      );

    // Format the response - only return minimal data
    const formattedBoards = boards.map((board) => {
      const boardData = board.data as { title?: string } | null;
      return {
        board_id: board.board_id,
        access_level: board.access_level,
        title: boardData?.title || "Untitled Board",
      };
    });

    return {
      success: true,
      boards: formattedBoards,
      user_info: {
        profile_id: profileId,
        client_id: oauth.clientId,
      },
    };
  } catch (error: any) {
    console.error("[OAuth Routes - List Boards] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch boards",
    });
  }
});
