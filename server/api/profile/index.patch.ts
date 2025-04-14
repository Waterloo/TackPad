import { PROFILE } from "~/server/database/schema";
import { useDrizzle, eq } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profileId;
  const db = useDrizzle();
  const authCount = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
    where: eq(tables.PROFILE_AUTHENTICATIONS.profile_id, profileId),
  });

  if (!authCount) {
    throw createError({
      statusCode: 403,
      message: "Only authenticated users can change profile",
    });
  }
  if (!profileId) {
    throw createError({
      statusCode: 401,
      message: "Not authenticated or no profile found",
    });
  }

  const body = await readBody(event);

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      message: "Request body is required",
    });
  }

  const updateData: Record<string, any> = {};

  // Allow firstName update
  if (body.firstName !== undefined) {
    updateData.firstName = body.firstName;
  }

  // Get existing profile

  const existingProfile = await db
    .select()
    .from(PROFILE)
    .where(eq(PROFILE.id, profileId))
    .limit(1);

  if (!existingProfile.length) {
    throw createError({
      statusCode: 404,
      message: "Profile not found",
    });
  }

  const currentProfile = existingProfile[0];

  // Handle email update - only if current email is null/empty
  if (body.email !== undefined) {
    if (currentProfile.email && currentProfile.email !== "") {
      throw createError({
        statusCode: 400,
        message: "Email can only be set once",
      });
    }
    updateData.email = body.email;
  }

  // Handle username update - only if current username is null/empty
  if (body.username !== undefined) {
    if (currentProfile.username && currentProfile.username !== "") {
      throw createError({
        statusCode: 400,
        message: "Username can only be set once",
      });
    }

    // Check if username is already taken
    const existingUsername = await db
      .select()
      .from(PROFILE)
      .where(eq(PROFILE.username, body.username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw createError({
        statusCode: 400,
        message: "Username already taken",
      });
    }

    updateData.username = body.username;
  }

  // If there are no valid updates, return early
  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields to update",
    });
  }

  // Update the profile
  await db.update(PROFILE).set(updateData).where(eq(PROFILE.id, profileId));

  // Return the updated profile
  const updatedProfile = await db
    .select()
    .from(PROFILE)
    .where(eq(PROFILE.id, profileId))
    .limit(1);
  return {
    id: updatedProfile[0].id,
    firstName: updatedProfile[0].firstName,
    email: updatedProfile[0].email,
    username: updatedProfile[0].username,
    createdAt: updatedProfile[0].createdAt,
  };
});
