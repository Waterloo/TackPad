import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { verifyUserToken } from '~/server/utils/tokenManagement';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
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
  
  // Check if settings exist
  const settings = await db.select().from(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.board_id, id)).limit(1);
  
  // If board exists but has no settings (oldBoard), we can't verify ownership
  // Decision: Either prevent deletion or allow it (depending on your security requirements)
  if (settings.length === 0) {
    throw createError({
      statusCode: 403,
      message: 'Cannot delete boards without ownership information'
    });
  }
  
  // Verify user is the owner of this board
  const isOwner = verifyUserToken(event, settings[0].user_token);
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized: Only the board owner can delete this board'
    });
  }
  
  // If we reach here, user is authorized to delete the board
  try {
    // Delete board settings first
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