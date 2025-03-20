import { useBoardStore } from './board'

export const useImageStore = defineStore('images', () => {

  const boardStore = useBoardStore()

  const addImage = async (image: File) => {
    // const formData = new FormData()
    // formData.append('image', image)
    // const response = await fetch('/api/upload/123', {
    //   method: 'POST',
    //   body: formData
    // })
    // const data = await response.json()
    // return data

    const ImageItem = {
      id: `IMAGE-${Math.random()}`,
      kind: 'image',
      content: {
        url: URL.createObjectURL(image),
        alt: image.name
      },
      x_position: 0,
      y_position: 0,
      width: 400,
      height: 200
    };

    boardStore.board.data.items.push(ImageItem);
  }

  return {
    addImage
  }

})