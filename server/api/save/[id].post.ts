import { IndexColumn } from 'drizzle-orm/sqlite-core';
import { values } from 'lodash';
import { BOARDS } from '~/server/database/schema';
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

  return {
    success: true
  };
});