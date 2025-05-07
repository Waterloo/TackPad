import { customAlphabet } from 'nanoid';
import { getRandomBoardName } from '~/server/utils/boardNames';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { setupUserToken, verifyUserToken } from '~/server/utils/tokenManagement';
import { eq } from 'drizzle-orm';


export default defineEventHandler(async (event) => {
    const db = useDrizzle();
    const authHeader = event.node.req.headers.authorization;
    const boardsForUser = await db
    .select()
    .from(BOARDS)
    .innerJoin(BOARD_SETTINGS, eq(BOARDS.board_id, BOARD_SETTINGS.board_id))
    .where(eq(BOARD_SETTINGS.user_token, authHeader));
    return boardsForUser;
})