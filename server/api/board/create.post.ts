import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../utils/db'
import { sqlNow } from '../../utils/board'
import { generateBoardName } from '../../utils/boardNames'
import { reserveDefaultCustomBoardUrl } from '../../utils/boardCustomUrl'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)
  const body = await readBody<{ boardType?: 'standard' | 'vault'; title?: string }>(event).catch(() => ({}))
  const boardType = body?.boardType === 'vault' ? 'vault' : 'standard'

  const id = `BOARD-${nanoid(10)}`
  const now = sqlNow()
  const title = body?.title?.trim() || (boardType === 'vault' ? 'Vault' : generateBoardName())

  const noteId = `note-${nanoid(8)}`
  const todoId = `todo-${nanoid(8)}`

  const starterItems = {
    [noteId]: {
      id: noteId,
      kind: 'note',
      x_position: -160,
      y_position: -100,
      width: 260,
      height: 260,
      lock: false,
      displayName: 'Welcome Note',
      createdAt: now,
      createdBy: profileId,
      lastUpdatedAt: now,
      lastUpdatedBy: profileId,
      content: {
        text: '<p>Welcome to your new board! ✏️</p><p>Click here to edit this note, or drag it around the canvas.</p>',
        color: '#FEF9C3',
      },
    },
    [todoId]: {
      id: todoId,
      kind: 'todo',
      x_position: 140,
      y_position: -100,
      width: 260,
      height: 260,
      lock: false,
      displayName: 'Getting Started',
      createdAt: now,
      createdBy: profileId,
      lastUpdatedAt: now,
      lastUpdatedBy: profileId,
      content: {
        title: 'Getting started',
        tasks: [
          { task_id: nanoid(6), content: 'Explore the toolbar below', completed: false },
          { task_id: nanoid(6), content: 'Add a sticky note or image', completed: false },
          { task_id: nanoid(6), content: 'Share this board with a friend', completed: false },
        ],
      },
    },
  }

  await db.insert(schema.boards).values({
    id,
    ownerId: profileId,
    title,
    boardType,
    data: JSON.stringify({ items: boardType === 'vault' ? {} : starterItems, drawings: {} }),
    accessLevel: boardType === 'vault' ? 'private' : 'public',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.boardAccess).values({
    boardId: id,
    profileId,
    role: 'owner',
  })

  const customUrl = await reserveDefaultCustomBoardUrl(db, id, title)

  return { id, customUrl }
})
