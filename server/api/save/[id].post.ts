import { IndexColumn } from 'drizzle-orm/sqlite-core';
import { values } from 'lodash';
import { BOARDS } from '~/server/database/schema';
import { getSSEServer } from '~/shared/board';
import { Board } from '~/types/board';

export default defineEventHandler(async (event) => {
  
  const boardId = event.context.params?.id;

  if (!boardId) {
    throw createError({
      statusCode: 400,
      message: 'Board ID is required'
    });
  }

  const body = await readBody(event) as Board;

  await useDrizzle().insert(BOARDS).values(body).onConflictDoUpdate({ target: BOARDS.board_id, set: { data: body.data } })

  const server = getSSEServer(boardId)
  server.pathname = '/send'
  fetch(server, {
    method: 'POST',
    body:JSON.stringify({room: boardId}),
    headers: {
      "content-type": 'application/json'
    }
  })
  console.log('saving')

  return {
    success: true
  };
});