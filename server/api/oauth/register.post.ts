import { defineEventHandler, createError, readBody } from "h3";
import { useDrizzle, tables } from "~/server/utils/drizzle";
import { nanoid } from "nanoid";

export default defineEventHandler(async (event) => {
  // Only allow POST requests
  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }

  const body = await readBody(event);
  const { name, description, redirect_uris } = body;

  // Validation
  if (
    !name ||
    typeof name !== "string" ||
    name.length < 1 ||
    name.length > 100
  ) {
    throw createError({
      statusCode: 400,
      message: "Invalid name - must be 1-100 characters",
    });
  }

  if (
    !redirect_uris ||
    !Array.isArray(redirect_uris) ||
    redirect_uris.length === 0
  ) {
    throw createError({
      statusCode: 400,
      message: "redirect_uris must be a non-empty array",
    });
  }

  // Validate each redirect URI
  for (const uri of redirect_uris) {
    if (typeof uri !== "string" || uri.length < 1) {
      throw createError({
        statusCode: 400,
        message: "Each redirect_uri must be a valid string",
      });
    }
    // Basic URL validation for non-Telegram URIs
    if (
      !uri.startsWith("https://t.me/") &&
      !uri.startsWith("http://localhost")
    ) {
      try {
        new URL(uri);
      } catch {
        throw createError({
          statusCode: 400,
          message: `Invalid redirect_uri: ${uri}`,
        });
      }
    }
  }

  try {
    const db = useDrizzle();
    const clientId = `client_${nanoid(16)}`;
    const clientSecretPlain = nanoid(32);
    const clientSecretHashed = nanoid(32); // Different random value for hash storage
    const now = new Date().toISOString();

    await db.insert(tables.OAUTH_APPS).values({
      client_id: clientId,
      client_secret: clientSecretHashed,
      name: name.trim(),
      description: description?.trim() || null,
      redirect_uris: JSON.stringify(redirect_uris),
      created_at: now,
      updated_at: now,
    });

    // Return the credentials (client_secret is ONLY shown once)
    return {
      success: true,
      client_id: clientId,
      client_secret: clientSecretPlain,
      name: name.trim(),
      redirect_uris,
      message: "Save the client_secret - it will not be shown again",
    };
  } catch (error: any) {
    console.error("[OAuth Register] Error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to register OAuth app",
    });
  }
});
