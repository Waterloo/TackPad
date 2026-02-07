import { defineEventHandler, createError, getHeader } from "h3";
import { useDrizzle, tables, eq } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  // Only process oauth_routes
  if (!event.path.startsWith("/api/oauth_routes/")) {
    return;
  }

  const authHeader = getHeader(event, "authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Bearer token required",
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Token missing",
    });
  }

  try {
    const db = useDrizzle();
    const now = new Date().toISOString();

    // Look up the token
    const oauthToken = await db.query.OAUTH_TOKENS.findFirst({
      where: eq(tables.OAUTH_TOKENS.token, token),
    });

    if (!oauthToken) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized - Invalid token",
      });
    }

    // Check if token is expired
    if (oauthToken.expires_at < now) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized - Token expired",
      });
    }

    // Update last_used_at
    await db
      .update(tables.OAUTH_TOKENS)
      .set({ last_used_at: now })
      .where(eq(tables.OAUTH_TOKENS.token, token));

    // Set OAuth context for the request
    event.context.oauth = {
      token: oauthToken.token,
      clientId: oauthToken.client_id,
      profileId: oauthToken.profile_id,
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error("[OAuth Middleware] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Internal server error during OAuth validation",
    });
  }
});
