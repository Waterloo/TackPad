import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)


export const useImageStore = defineStore('images', () => {

  const {calculateCenterPosition} = useItemManagement()
  const boardStore = useBoardStore()

  const addImage = async (images: File | File[]) => {
    if(!Array.isArray(images)){
      images = [images]
    }

    const formData = new FormData()
    images.forEach((file, index) => {
      const id =`IMG-${nanoid(10)}` 
      formData.append(id, file)
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {

        // find optimal size
        const aspectRatio = img.width / img.height
        const width = Math.min(400, img.width)
        const height = width / aspectRatio
        const position = calculateCenterPosition(width,height,'image')
        

        const ImageItem = {
          id,
          kind: 'image',
          content: {
          url: URL.createObjectURL(file)
        },
        x_position: position.x,
        y_position: position.y,
        width,
        height
      };
      boardStore.board.data.items.push(ImageItem);
      console.log('added image')
    }
    })




    const response = await fetch(`/api/upload/${boardStore.board?.board_id}`, {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    // return data
    Object.entries(data).forEach(([id, url]) => {
      boardStore.board.data.items.forEach((item, index) => {
        if(item.id === id && item.kind === 'image') {
          if(url){
          item.content.url = url as string
          formData.delete(id)
        }
        else {
          // TODO: remove failed images when selecting items from board
          item.content.status = 'failed'
        }
        }
      })

    })

    boardStore.debouncedSaveBoard()
  }

  return {
    addImage
  }

})