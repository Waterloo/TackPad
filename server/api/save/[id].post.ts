import { IndexColumn } from 'drizzle-orm/sqlite-core';
import { values } from 'lodash';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { Board } from '~/types/board';
import { setupUserToken,verifyUserToken } from '~/server/utils/tokenManagement';

export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profile_id || null;
  const userToken = setupUserToken(event);
  const boardId = event.context.params?.id;

  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }

  // get board settings
  const db = useDrizzle();
   // Find the owner settings for this board
   const ownerSettings = await db.select()
   .from(BOARD_SETTINGS)
   .where(
     and(
       eq(BOARD_SETTINGS.board_id, boardId),
       eq(BOARD_SETTINGS.is_owner, true)
     )
   )
   .limit(1);

   if(ownerSettings.length > 0 && ownerSettings[0].read_only === true){
    if(!profileId) {
      if(ownerSettings[0].profile_id !== profileId) {
        throw createError({
          statusCode: 403,
          message: 'Unauthorized: Only the board owner can save this board'
        });
      }
    }else{
     const isOwner = verifyUserToken(event, ownerSettings[0].user_token);
     if(!isOwner) {
      throw createError({
        statusCode: 403,
        message: 'Unauthorized: Only the board owner can save this board'
      });
    }
    }
   }

  const body = await readBody(event) as Board;

  await useDrizzle().insert(BOARDS).values(body).onConflictDoUpdate({ target: BOARDS.board_id, set: { data: body.data } })

  return {
    success: true
  };
});