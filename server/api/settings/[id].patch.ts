export default defineEventHandler(async (event) => {
  const profileId = event.context.session?.secure?.profile_id || null;
 
});