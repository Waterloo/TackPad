import { customAlphabet } from 'nanoid';
import { getRandomBoardName } from '~/server/utils/boardNames';
import { BOARDS, BOARD_SETTINGS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
import { setupUserToken, verifyUserToken } from '~/server/utils/tokenManagement';
import { eq, desc, and, or } from 'drizzle-orm';
import Content from '~/layouts/content.vue';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

export default defineEventHandler(async(event)=>{
  const id = decodeURIComponent(event.context.params?.id||'')
  
  // check for id
  if(!id){
    throw createError({
      statusCode:400,
      message:'Board ID is required'
    })
  }

  const db = useDrizzle();
  const userToken = setupUserToken(event);
  const profileId = event.context.session?.secure?.profileId || null


  // check if board exists

  const board = await db.select().from(BOARDS).where(eq(BOARDS.board_id,id)).limit(1)

  // list of boards belong to this user
  const userBoards = await getUserBoards(db, userToken, profileId);

  // CASE 1 board doesnt exist

  if(board.length===0){
    
    // create new board
    const newBoard = await getWelcomeBoard(id)
    
    // create a new settings

    const newSettings = {
      id:nanoid(),
      board_id:newBoard.board_id,
      title:newBoard.data.title,
      user_token:userToken,
      profile_id:profileId,
      is_owner:true,
      read_only:false,
      last_accessed:new Date().toISOString(),
      last_modified:new Date().toISOString()
    }

    await db.insert(BOARD_SETTINGS).values(newSettings)

    

    return{
      data:newBoard,
      settings:newSettings,
      userBoards:userBoards,
      oldBoard:false,
      isOwner:true
    }
  }
// CASE 2 Board Exists

const boardData = board[0]


  // check for owner settings

  const ownerSettings = await db.select()
        .from(BOARD_SETTINGS)
        .where(
          and(
            eq(BOARD_SETTINGS.board_id, id),
            eq(BOARD_SETTINGS.is_owner, true)
          )
        )
        .limit(1);

  //CASE 2 A no ownerSettings found means old board
  if(ownerSettings.length ===0){
    return{
      data:boardData,
      settings:{},
      userBoards:userBoards,
      oldBoard:true,
      isOwner:true
    }
  }
  
  // check for user specific settings
  const userSettings = await db.select().from(BOARD_SETTINGS).where(and(eq(BOARD_SETTINGS.board_id,id),or(eq(BOARD_SETTINGS.user_token,userToken),profileId ? eq(BOARD_SETTINGS.profile_id,profileId):undefined))).limit(1)

  // CASE 2B owner settings exists user accessing for first time
  if(userSettings.length==0){
    const newSettings = {
      id: nanoid(),
      board_id: id,
      title: boardData.data.title,
      user_token: userToken,
      profile_id: profileId,
      read_only:ownerSettings[0]?.read_only || false,
      is_owner: false,
      last_accessed: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };
    await db.insert(BOARD_SETTINGS).values(newSettings)
    return{
      oldBoard:false,
      isOwner:false,
      data:boardData,
      settings:newSettings,
      userBoards:userBoards
    }
  }
//  CASE 3 user settings exists

const userSettingsData = userSettings[0]

// updated last accessed time and profile id if logged in
// Update object for settings
const updateData = {
  last_accessed: new Date().toISOString()
};

// Only update profile_id if it exists
if(profileId) {
  updateData.profile_id = profileId;
}

// Updated to use the specific setting id
await db.update(BOARD_SETTINGS)
  .set(updateData)
  .where(eq(BOARD_SETTINGS.id, userSettingsData.id)); 

return{
  data:boardData,
  settings:userSettingsData,
  userBoards:userBoards,
  oldBoard:false,
  isOwner:userSettingsData.is_owner
}
})




// Helper function to get user boards
async function getUserBoards(db, userToken, profileId) {
  return await db.select()
    .from(BOARD_SETTINGS)
    .where(
      or(
        eq(BOARD_SETTINGS.user_token, userToken),
        profileId ? eq(BOARD_SETTINGS.profile_id, profileId) : undefined
      )
    )
    .orderBy(desc(BOARD_SETTINGS.last_accessed));
}
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