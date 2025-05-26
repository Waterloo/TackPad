import { PROFILE, USAGE_QUOTA } from "~/server/database/schema";
import { useDrizzle, eq } from "~/server/utils/drizzle";

export default defineEventHandler(async (event) => {
  // Get profileId from context (added by auth middleware)
  const profileId = event.context.session?.secure?.profileId;

  if (!profileId) {
    throw createError({
      statusCode: 401,
      message: "Not authenticated or no profile found",
    });
  }

  const db = useDrizzle();
  const result = await db
    .select()
    .from(PROFILE)
    .leftJoin(USAGE_QUOTA, eq(PROFILE.id, USAGE_QUOTA.profile_id))
    .where(eq(PROFILE.id, profileId))
    .limit(1);

  if (!result.length) {
    throw createError({
      statusCode: 404,
      message: "Profile not found",
    });
  }

  return {
    id: result[0].Profile.id,
    firstName: result[0].Profile.firstName,
    email: result[0].Profile.email,
    username: result[0].Profile.username,
    createdAt: result[0].Profile.createdAt,
    consumption: result[0].usage_quota?.consumption || 0,
    limit: result[0].usage_quota?.limit || 25000000,
  };
});
