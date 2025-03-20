import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { verifyUserToken } from '~/server/utils/tokenManagement';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profile_id || null;

  const id = decodeURIComponent(event.context.params?.id || '');
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }

  const db = useDrizzle();
  
  // Check if board exists
  const board = await db.select().from(BOARDS).where(eq(BOARDS.board_id, id)).limit(1);
  if (board.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Board not found'
    });
  }
  
  // Find the owner settings for this board
  const ownerSettings = await db.select()
    .from(BOARD_SETTINGS)
    .where(
      and(
        eq(BOARD_SETTINGS.board_id, id),
        eq(BOARD_SETTINGS.is_owner, true)
      )
    )
    .limit(1);
  
  // Check if the board has an owner
  if (ownerSettings.length === 0) {
    throw createError({
      statusCode: 403,
      message: 'Cannot delete boards without ownership information'
    });
  }
  
  // Verify if current user is the owner
  let isOwner = false;
  if (profileId && ownerSettings[0].profile_id) {
    isOwner = profileId === ownerSettings[0].profile_id;
  } else {
    isOwner = verifyUserToken(event, ownerSettings[0].user_token);
  }
  
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized: Only the board owner can delete this board'
    });
  }
  
  // If we reach here, user is authorized to delete the board
  try {
    // Delete all settings for this board
    await db.delete(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.board_id, id));
    
    // Delete the board
    await db.delete(BOARDS).where(eq(BOARDS.board_id, id));
    
    return {
      success: true,
      message: 'Board deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting board:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to delete board'
    });
  }
});