import { customAlphabet } from 'nanoid';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { setupUserToken, verifyUserToken } from '~/server/utils/tokenManagement';
import { eq } from 'drizzle-orm';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export default defineEventHandler(async (event) => {
  const id = decodeURIComponent(event.context.params?.id || '');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }

  const db = useDrizzle();
  const userToken = setupUserToken(event);
  
  // Check if board exists first
  const board = await db.select().from(BOARDS).where(eq(BOARDS.board_id, id)).limit(1);
  const boardExists = board.length > 0;
  
  // Check if settings exist
  const settings = await db.select().from(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.board_id, id)).limit(1);
  const settingsExist = settings.length > 0;
  
  let responseData;
  let responseSettings;
  let oldBoard = false;
  let isOwner = false;
  
  if (!boardExists) {
    // Case 2: Board doesn't exist - create a new board and settings
    const newBoard = await getWelcomeBoard(id);
    responseData = newBoard;
    
    // Create new settings
    const newSettings = {
      board_id: newBoard.board_id,
      user_token: userToken,
      profile_id: null,
      last_accessed: new Date().toISOString()
    };
    
    await db.insert(BOARD_SETTINGS).values(newSettings);
    responseSettings = [newSettings];
    
    oldBoard = false;
  } else if (boardExists && !settingsExist) {
    // Case 3: Board exists but settings don't - return oldBoard: true
    responseData = board[0];
    responseSettings = [];
    oldBoard = true;
  } else {
    // Case 1: Both board and settings exist
    responseData = board[0];
    responseSettings = settings;
    
    // Update last_accessed time
    await db.update(BOARD_SETTINGS)
      .set({ last_accessed: new Date().toISOString() })
      .where(eq(BOARD_SETTINGS.board_id, id));
      
    // Check if user is the owner of this board
    isOwner = verifyUserToken(event, settings[0].user_token);
    
    oldBoard = false;
  }
  
  return {
    data: responseData,
    settings: responseSettings,
    oldBoard: oldBoard,
    isOwner: isOwner
  };
});

function makeUrlSafe(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

async function getWelcomeBoard(board_id: string) {
  const board = {
    board_id: board_id === 'create' ? `BOARD-${nanoid(10)}` : makeUrlSafe(decodeURIComponent(board_id)),
    data: {
      title: 'Untitled TackPad',
      items: [{
        id: `STICKY-${nanoid(10)}`,
        kind: 'note',
        content: {
          text: 'Welcome to your board!\nTry adding more notes and todo lists.',
          color: '#FFD700'
        },
        x_position: 100,
        y_position: 48,
        width: 300,
        height: 300,
      },
      {
        id: `TODO-${nanoid(10)}`,
        kind: 'todo',
        content: {
          title: 'Getting Started',
          tasks: [
            { task_id: '1', content: 'Add a new note', completed: false },
            { task_id: '2', content: 'Create a todo list', completed: false },
            { task_id: '3', content: 'Try panning and zooming', completed: false },
          ]
        },
        x_position: 420,
        y_position: 48,
        width: 300,
        height: 300,
      }],
    },
  };

  await useDrizzle().insert(BOARDS).values(board).onConflictDoUpdate({ target: BOARDS.board_id, set: board })

  return board
}