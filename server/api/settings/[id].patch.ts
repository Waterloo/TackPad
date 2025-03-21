import { eq } from 'drizzle-orm'
import { BOARD_SETTINGS } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profile_id || null;
  const id = decodeURIComponent(event.context.params?.id || '');
  const db = useDrizzle();

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Settings ID is required'
    });
  } 

  const settings = await db.select().from(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.id, id)).limit(1);
  if (settings.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Settings not found'
    });
  }

  const settingsData = settings[0];
  const body = await readBody(event);
  
  // Define which fields can only be modified by the owner
  const ownerOnlyFields = ['title', 'read_only'];
  
  // Create separate update objects for owner-only and user-specific fields
  const ownerUpdateData = {};
  const userUpdateData = {};
  
  // Process all fields in the request body
  for (const [key, value] of Object.entries(body)) {
    if (ownerOnlyFields.includes(key)) {
      // Only include owner-only fields if user is the owner
      if (settingsData.is_owner) {
        ownerUpdateData[key] = value;
      }
    } else {
      // For non-owner-only fields, always include them in user-specific update
      userUpdateData[key] = value;
    }
  }
  
  // First, update all settings with the same board_id if there are owner-only fields to update
  if (Object.keys(ownerUpdateData).length > 0 && settingsData.is_owner) {
    await db.update(BOARD_SETTINGS)
      .set(ownerUpdateData)
      .where(eq(BOARD_SETTINGS.board_id, settingsData.board_id));
  }
  
  // Then, update user-specific fields only for this settings entry
  if (Object.keys(userUpdateData).length > 0) {
    await db.update(BOARD_SETTINGS)
      .set(userUpdateData)
      .where(eq(BOARD_SETTINGS.id, id));
  }
  
  // Fetch and return the updated settings
  const updatedSettings = await db.select().from(BOARD_SETTINGS).where(eq(BOARD_SETTINGS.id, id)).limit(1);
  
  return updatedSettings[0];
});