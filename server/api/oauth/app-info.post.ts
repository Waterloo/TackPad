import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle, tables, eq } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }

  const body = await readBody(event);
  const { client_id } = body;

  if (!client_id || typeof client_id !== "string") {
    throw createError({
      statusCode: 400,
      message: "client_id is required",
    });
  }

  try {
    const db = useDrizzle();

    const app = await db.query.OAUTH_APPS.findFirst({
      where: eq(tables.OAUTH_APPS.client_id, client_id),
      columns: {
        client_id: true,
        name: true,
        description: true,
        redirect_uris: true,
        created_at: true,
      },
    });

    if (!app) {
      throw createError({
        statusCode: 404,
        message: "Application not found",
      });
    }

    return {
      ...app,
      redirect_uris: JSON.parse(app.redirect_uris),
    };

  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error("[OAuth App Info] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch app information",
    });
  }
});
