/**
 * Random board name generator — produces fun "emoji + adjective + noun" titles
 * so new boards aren't all called "Untitled Board".
 */

const ADJECTIVES = [
  'Bright', 'Swift', 'Cosmic', 'Golden', 'Chill', 'Bold', 'Lucky', 'Vivid',
  'Sneaky', 'Fuzzy', 'Mighty', 'Cozy', 'Zappy', 'Breezy', 'Zippy', 'Groovy',
  'Turbo', 'Nifty', 'Snappy', 'Fizzy', 'Jolly', 'Plucky', 'Dapper', 'Peppy',
  'Rustic', 'Sleek', 'Funky', 'Witty', 'Nimble', 'Dandy',
]

const NOUNS = [
  'Canvas', 'Board', 'Studio', 'Space', 'Lab', 'Sketch', 'Nest', 'Hub',
  'Pad', 'Forge', 'Deck', 'Zone', 'Den', 'Grid', 'Vault', 'Workshop',
  'Attic', 'Realm', 'Arena', 'Shelf', 'Cove', 'Dock', 'Summit', 'Garden',
  'Bench', 'Loft', 'Lodge', 'Parlor', 'Bazaar', 'Sandbox',
]

const EMOJIS = [
  '🎨', '🚀', '✨', '🌈', '🔥', '💡', '🎯', '🧩', '🌟', '🎪',
  '🏗️', '📐', '🪄', '🎲', '⚡', '🌀', '🎭', '🧲', '🔮', '🪁',
  '🎸', '🌻', '🦊', '🐙', '🦋', '🍀', '🧪', '🎈', '🪐', '🍭',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateBoardName(): string {
  return `${pick(EMOJIS)} ${pick(ADJECTIVES)} ${pick(NOUNS)}`
}
