import { customAlphabet } from 'nanoid';
import { getRandomBoardName } from '~/server/utils/boardNames';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { setupUserToken, verifyUserToken } from '~/server/utils/tokenManagement';
import { eq, desc, and, or } from 'drizzle-orm';
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
  
  // Get profile ID if user is logged in
  const profileId = event.context.session?.secure?.profileId || null;
  
  // Check if board exists first
  const board = await db.select().from(BOARDS).where(eq(BOARDS.board_id, id)).limit(1);
  const boardExists = board.length > 0;
  
  // Check if settings exist for this board and user (either by token or profile ID)
  const settings = await db.select()
    .from(BOARD_SETTINGS)
    .where(
      and(
        eq(BOARD_SETTINGS.board_id, id),
        or(
          eq(BOARD_SETTINGS.user_token, userToken),
          profileId ? eq(BOARD_SETTINGS.profile_id, profileId) : undefined
        )
      )
    )
    .limit(1);
  
  const settingsExist = settings.length > 0;
  
  // Check if any settings exist for this board (to determine if it's an old board)
  const anySettings = await db.select()
    .from(BOARD_SETTINGS)
    .where(eq(BOARD_SETTINGS.board_id, id))
    .limit(1);
  
  const hasAnySettings = anySettings.length > 0;
  
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
      id: nanoid(),
      board_id: newBoard.board_id,
      title: newBoard.data.title,
      user_token: userToken,
      profile_id: profileId,
      is_owner: true,
      last_accessed: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };
    
    // Insert new settings with proper primary key handling
    await db.insert(BOARD_SETTINGS)
      .values(newSettings)
      .onConflictDoUpdate({ 
        target: [BOARD_SETTINGS.id],
        set: { 
          user_token: userToken,
          profile_id: profileId,
          last_accessed: new Date().toISOString() 
        } 
      });

    responseSettings = [newSettings];
    isOwner = true;
    oldBoard = false;
  } else if (boardExists && !hasAnySettings) {
    // This is an old board with no settings at all - mark as oldBoard = true
    responseData = board[0];
    responseSettings = [{
      id: nanoid(),
      board_id: id,
      title: responseData.data.title,
      user_token: userToken,
      profile_id: profileId,
      is_owner: true, // Default to owner for backward compatibility
      last_accessed: new Date().toISOString(),
      last_modified: new Date().toISOString()
    }];
    isOwner = true;
    oldBoard = true;
  } else if (boardExists && !settingsExist) {
    // Case 3: Board exists with settings, but this user has no settings for it yet
    responseData = board[0];
    
    // Check if anyone owns this board
    const ownerSettings = await db.select()
      .from(BOARD_SETTINGS)
      .where(
        and(
          eq(BOARD_SETTINGS.board_id, id),
          eq(BOARD_SETTINGS.is_owner, true)
        )
      )
      .limit(1);
    
    // Create settings for this user (non-owner if the board already has an owner)
    const newSettings = {
      id: nanoid(),
      board_id: id,
      title: responseData.data.title,
      user_token: userToken,
      profile_id: profileId,
      is_owner: ownerSettings.length === 0, // Only set as owner if no owner exists
      last_accessed: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };
    
    // Insert new settings with proper primary key handling
    await db.insert(BOARD_SETTINGS)
      .values(newSettings)
      .onConflictDoUpdate({ 
        target: [BOARD_SETTINGS.id],
        set: { 
          user_token: userToken,
          profile_id: profileId,
          last_accessed: new Date().toISOString() 
        } 
      });
    
    responseSettings = [newSettings];
    isOwner = newSettings.is_owner;
    oldBoard = false;
  } else {
    // Case 1: Both board and settings exist for this user
    responseData = board[0];
    
    // Update last_accessed time
    await db.update(BOARD_SETTINGS)
      .set({ 
        last_accessed: new Date().toISOString(),
        profile_id: profileId // Update profile ID if user has logged in
      })
      .where(
        and(
          eq(BOARD_SETTINGS.board_id, id),
          eq(BOARD_SETTINGS.user_token, userToken)
        )
      );
    
    responseSettings = settings;
    isOwner = settings[0].is_owner;
    oldBoard = false;
  }
  
  // Get all boards this user has accessed (for history/recent boards)
  const userBoards = await db.select()
    .from(BOARD_SETTINGS)
    .where(
      or(
        eq(BOARD_SETTINGS.user_token, userToken),
        profileId ? eq(BOARD_SETTINGS.profile_id, profileId) : undefined
      )
    )
    .orderBy(desc(BOARD_SETTINGS.last_accessed));
  
  return {
    data: responseData,
    settings: responseSettings[0],
    userBoards: userBoards,
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
      title: getRandomBoardName(),
      items: [{
        id: `STICKY-${nanoid(10)}`,
        kind: 'note',
        content: {
          text: ` <h1>Welcome to your board!</h1>
  <p>Try adding more notes and todo lists.</p>
  <h2>Quick Tips:</h2>
  <ul>
    <li>
      <p>Double-click to edit notes</p>
    </li>
    </ul>`,
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