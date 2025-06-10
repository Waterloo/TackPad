import { customAlphabet } from 'nanoid';
import { BOARDS } from '~/server/database/schema';
import { Board, LinkItem } from '~/types/board';
import { eq } from 'drizzle-orm';
import { fetchMetadata, isValidUrl } from '~/server/utils/extractUrlFromRequest';
import { findAvailablePosition } from '~/shared/board';
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export default defineEventHandler(async (event) => {
  // Set CORS headers
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  // Handle OPTIONS request for CORS preflight
  if (event.method === 'OPTIONS') {
    return null;
  }

  const boardId = event.context.params?.id;

  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }

  const body = await readBody(event) as {link: string};

  if (!body.link || !isValidUrl(body.link)) {
    throw createError({
      statusCode: 400,
      message: 'Valid URL is required'
    });
  }

  // Fetch existing board data
  const db = useDrizzle();
  const existingBoard = await db.select().from(BOARDS).where(eq(BOARDS.board_id, boardId));

  if (!existingBoard || existingBoard.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Board not found'
    });
  }

  try {
    // Get existing board data or initialize new
    const boardData: Board['data'] = existingBoard[0].data ?
      (existingBoard[0].data as Board['data']) :
      { items: {} };

    // Define item dimensions
    const dimensions = {
      width: 300,
      height: 320
    };

    // Find available position
    const position = findAvailablePosition(boardData, dimensions);

    // Fetch metadata for the link
    const metadataResult = await fetchMetadata(body.link);

    // Create link item with proper structure
    const linkItem: LinkItem = {
      id: `LINK-${nanoid()}`,
      kind: 'link',
      content: {...metadataResult.data, url: body.link},
      x_position: position.x,
      y_position: position.y,
      width: dimensions.width,
      height: dimensions.height
    };

    // Add new link item to board
    boardData.items = boardData.items || {};
    boardData.items[linkItem.id] = linkItem;

    // Update the board
    await db.update(BOARDS)
      .set({ data:boardData })
      .where(eq(BOARDS.board_id, boardId));

    return {
      success: true,
      data: boardData
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch metadata'
    });
  }
});
