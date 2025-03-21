import { nanoid } from "nanoid";
import { USAGE_QUOTA, USER_UPLOADS, type InsertUserUpload } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const body = await readFormData(event);
  const board_id = decodeURIComponent(event.context.params?.id ||'')
  const profile_id =  event.context.session.secure.profileId
  const files = [...body.entries()].filter(
    ([_, entry]) => entry instanceof File
  ) as [string, File][];
  const fids = files.map(([_, file]) => {
    return `${nanoid()}.${getExtension(file)}`;
  });

  const filePromises = files.map(async ([id, file], index) => {
    const fileName = fids[index];
    return useStorage("tackpad").setItemRaw(
      fileName,
      Buffer.from(await file.arrayBuffer())
    );
  });


  const results = await Promise.allSettled(filePromises);
  const response = results.reduce((acc, result, index) => {
    const key = files[index][0];
    if (result.status === "fulfilled") {
        acc.data.push({
        board_id,
        profile_id,
        file_url: `https://assets.tackpad.xyz/${fids[index]}`,
        file_name: fids[index],
        file_type: files[index][1].type,
        file_size: files[index][1].size,
        created_at: new Date().toISOString()
      })  
      acc.keys[files[index][0]] = `https://assets.tackpad.xyz/${fids[index]}`;
    } else {
        acc.keys[files[index][0]] = null
    }
    return acc;
  }, {data:[], keys:{}} as {data: InsertUserUpload[], keys: Record<string, string | null>});

    try{
    const db = useDrizzle();
    if(response.data.length > 0){
      const consumption = response.data.reduce((acc, file) => {
        return acc + (file?.file_size || 0)
       }, 0);  
      await db.insert(USER_UPLOADS).values(response.data)
      await db.insert(USAGE_QUOTA).values({profile_id, consumption, updated_at: new Date().toISOString()}).onConflictDoUpdate({target: USAGE_QUOTA.profile_id, set: {consumption: sql`${USAGE_QUOTA.consumption} + ${consumption}`}})
    }}
    catch (error) {
      console.error('Error uploading files:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to upload files'
      })
    }
  return response.keys;
});

function getExtension(file: File) {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/ico": "ico",
    "audio/mpeg": "mp3",
  };

  return mimeToExtension[file.type];
}
