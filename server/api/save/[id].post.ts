import { IndexColumn } from 'drizzle-orm/sqlite-core';
import { values } from 'lodash';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { Board } from '~/types/board';
import { setupUserToken, verifyUserToken } from '~/server/utils/tokenManagement';
import { eq, and, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profileId || null;
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
    if(profileId) {
      if(ownerSettings[0].profile_id !== profileId) {
        throw createError({
          statusCode: 403,
          message: 'Unauthorized: Only the board owner can save this board'
        });
      }
      
    } else {
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

  // Save the board data
  await db.insert(BOARDS).values(body).onConflictDoUpdate({ target: BOARDS.board_id, set: { data: body.data } });
  
  // Get user's specific settings for this board first (to check if it exists)
  const userSettings = await db.select()
    .from(BOARD_SETTINGS)
    .where(
      and(
        eq(BOARD_SETTINGS.board_id, boardId),
        or(
          eq(BOARD_SETTINGS.user_token, userToken),
          profileId ? eq(BOARD_SETTINGS.profile_id, profileId) : undefined
        )
      )
    )
    .limit(1);
  
  // Update the last_modified time and title if it changed
  if (userSettings && userSettings.length > 0) {
    const updateData = { 
      last_modified: new Date().toISOString()
    };
    
    // Update title if it changed
    if (body.data.title && body.data.title !== userSettings[0].title) {
      updateData.title = body.data.title;
    }
    
    await db.update(BOARD_SETTINGS)
      .set(updateData)
      .where(eq(BOARD_SETTINGS.id, userSettings[0].id));
  }
  
  // Get updated settings after changes
  const updatedSettings = await db.select()
    .from(BOARD_SETTINGS)
    .where(
      and(
        eq(BOARD_SETTINGS.board_id, boardId),
        or(
          eq(BOARD_SETTINGS.user_token, userToken),
          profileId ? eq(BOARD_SETTINGS.profile_id, profileId) : undefined
        )
      )
    )
    .limit(1);

  return {
    success: true,
    settings: updatedSettings && updatedSettings.length > 0 ? updatedSettings[0] : null
  };
});