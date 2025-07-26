// useUser.ts
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

interface User {
  id: string
  name: string
  color: string
}

const currentUser = ref<User | null>(null)
const LOCAL_STORAGE_KEY = 'tackpad-collab-user'

function generateRandomName(): string {
  const adjectives = ['Happy', 'Brave', 'Clever', 'Daring', 'Eager', 'Funny', 'Gentle', 'Humble', 'Jolly', 'Kind']
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Lion', 'Bear', 'Wolf', 'Fox', 'Owl', 'Deer', 'Rabbit']
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${randomAdjective} ${randomNoun}`
}

function generateRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#A9CCE3', '#F1948A', '#82E0AA'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function useUser() {
  const storedUser = useLocalStorage<User | null>(
    LOCAL_STORAGE_KEY,
    null,
    {
      serializer: {
        read: (v: string) => {
          try {
            return v ? JSON.parse(v) : null
          } catch (error) {
            console.error('Error parsing stored user:', error)
            return null
          }
        },
        write: (v: User | null) => JSON.stringify(v),
      },
    },
  )

  if (!storedUser.value) {
    try {
      currentUser.value = {
        id: crypto.randomUUID(),
        name: generateRandomName(),
        color: generateRandomColor(),
      }
      storedUser.value = currentUser.value
    } catch (error) {
      console.error('Error creating user:', error)
    }
  } else {
    currentUser.value = storedUser.value
  }

  console.log('Current user:', currentUser.value)

  return {
    currentUser,
  }
}
