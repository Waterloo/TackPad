import { createStorage } from "unstorage";
import s3Driver from "unstorage/drivers/s3";

export default defineNitroPlugin(() => {

  const tackpadStorage = createStorage({
    driver: s3Driver({
      bucket: 'tackpad',
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      accessKeyId: '005b3d5b7e808b80000000001',
      secretAccessKey: 'K005ErZ3ChKTNJzDE86JG46ta3mrg7s',
      region: 'us-east-005'
    })
  })

  useStorage().mount('tackpad', tackpadStorage)
})