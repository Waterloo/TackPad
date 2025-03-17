import { customAlphabet } from 'nanoid';
import { BOARDS } from '~/server/database/schema';
import { useDrizzle } from '~/server/utils/drizzle';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)
export default defineEventHandler(async (event) => {
  const id = decodeURIComponent(event.context.params?.id || '');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }
  const board = await useDrizzle().select().from(tables.BOARDS).where(eq(BOARDS.board_id, id)).limit(1)
  // For development, return a board with some initial items
  const data = board[0] ?? await getWelcomeBoard(id)
  return data;
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