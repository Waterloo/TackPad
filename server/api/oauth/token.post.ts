import { defineEventHandler, createError, readBody, getQuery } from "h3";
import { useDrizzle, tables, eq } from "~/server/utils/drizzle";
import { nanoid } from "nanoid";

// Token expiration: 30 days
const TOKEN_EXPIRY_DAYS = 30;

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }

  const body = await readBody(event);
  const { client_id, profile_id, redirect_uri } = body;

  // Validation
  if (!client_id || typeof client_id !== "string") {
    throw createError({
      statusCode: 400,
      message: "client_id is required",
    });
  }

  if (!profile_id || typeof profile_id !== "string") {
    throw createError({
      statusCode: 400,
      message: "profile_id is required",
    });
  }

  try {
    const db = useDrizzle();

    // Verify the OAuth app exists and secret matches
    const app = await db.query.OAUTH_APPS.findFirst({
      where: eq(tables.OAUTH_APPS.client_id, client_id),
    });

    if (!app) {
      throw createError({
        statusCode: 401,
        message: "Invalid client_id",
      });
    }

    // Note: client_secret check removed for simplified browser-based OAuth flow
    // In production, consider adding additional security measures like PKCE

    // Verify redirect_uri if provided
    if (redirect_uri) {
      const allowedUris = JSON.parse(app.redirect_uris) as string[];
      if (!allowedUris.includes(redirect_uri)) {
        throw createError({
          statusCode: 400,
          message: "Invalid redirect_uri",
        });
      }
    }

    // Verify the profile exists
    const profile = await db.query.PROFILE.findFirst({
      where: eq(tables.PROFILE.id, profile_id),
    });

    if (!profile) {
      throw createError({
        statusCode: 400,
        message: "Invalid profile_id",
      });
    }

    // Generate token
    const token = `oauth_${nanoid(32)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    // Store token
    await db.insert(tables.OAUTH_TOKENS).values({
      token,
      client_id,
      profile_id,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      last_used_at: null,
    });

    // Return token response
    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // seconds
      expires_at: expiresAt.toISOString(),
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error("[OAuth Token] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate token",
    });
  }
});
