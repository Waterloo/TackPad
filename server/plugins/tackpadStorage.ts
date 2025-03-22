import { createStorage } from "unstorage";
import s3Driver from "unstorage/drivers/s3";

export default defineNitroPlugin(() => {

  const tackpadStorage = createStorage({
    driver: s3Driver({
      bucket: useRuntimeConfig().bucket,
      endpoint: useRuntimeConfig().endpoint,
      accessKeyId: useRuntimeConfig().accessKeyId,
      secretAccessKey: useRuntimeConfig().secretAccessKey,
      region: useRuntimeConfig().region
    })
  })

  useStorage().mount('tackpad', tackpadStorage)
})