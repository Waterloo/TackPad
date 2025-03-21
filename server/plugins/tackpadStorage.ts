import { createStorage } from "unstorage";
import s3Driver from "unstorage/drivers/s3";

export default defineNitroPlugin(() => {

  const tackpadStorage = createStorage({
    driver: s3Driver({
      bucket: process.env.STORAGE_BUCKET!,
      endpoint: process.env.STORAGE_ENDPOINT!,
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
      region: process.env.STORAGE_REGION!
    })
  })

  useStorage().mount('tackpad', tackpadStorage)
})