import { USAGE_QUOTA, USER_UPLOADS } from "~/server/database/schema";
import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { file_url } = body;
  const db = useDrizzle();
  const profile_id = event.context.session.secure.profileId;

  const authCount = await db.query.PROFILE_AUTHENTICATIONS.findFirst({
    where: eq(tables.PROFILE_AUTHENTICATIONS.profile_id, profile_id),
  });

  if (!authCount) {
    throw createError({
      statusCode: 403,
      message: "Only authenticated users can delete files",
    });
  }
  const storage = useStorage("tackpad");
  await storage.removeItem(file_url.replace("https://assets.tackpad.xyz/", ""));

  // Get the consumption data first
  const consumption = await db
    .select()
    .from(USER_UPLOADS)
    .where(eq(USER_UPLOADS.file_url, file_url))
    .limit(1);

  if (consumption.length > 0) {
    // Update the quota
    await db
      .update(USAGE_QUOTA)
      .set({
        consumption: sql`${USAGE_QUOTA.consumption} - ${consumption[0].file_size}`,
      })
      .where(eq(USAGE_QUOTA.profile_id, consumption[0].profile_id));

    // Delete the upload record
    await db.delete(USER_UPLOADS).where(eq(USER_UPLOADS.file_url, file_url));
  }

  return { success: true };
});
