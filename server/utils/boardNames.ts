const basicNames = [
    "New Amazing Tackpad",
    "New Brilliant Tackpad",
    "New Majestic Tackpad",
    "New Radiant Tackpad",
    "New Vibrant Tackpad",
    "New Stellar Tackpad",
    "New Luminous Tackpad",
    "New Epic Tackpad",
    "New Dazzling Tackpad",
    "New Spectacular Tackpad",
    "New Marvelous Tackpad",
    "New Glorious Tackpad",
    "New Shiny Tackpad",
    "New Elegant Tackpad",
    "New Grand Tackpad",
    "New Exquisite Tackpad",
    "New Supreme Tackpad",
    "New Bold Tackpad",
    "New Serene Tackpad",
    "New Dynamic Tackpad",
    "New Magnificent Tackpad",
    "New Resplendent Tackpad",
    "New Enchanting Tackpad",
    "New Heroic Tackpad",
    "New Jubilant Tackpad",
    "New Valiant Tackpad",
    "New Graceful Tackpad",
    "New Gleaming Tackpad",
    "New Lustrous Tackpad",
    "New Wondrous Tackpad",
    "New Shimmering Tackpad",
    "New Splendid Tackpad",
    "New Ravishing Tackpad",
    "New Breathtaking Tackpad",
    "New Euphoric Tackpad",
    "New Fearless Tackpad",
    "New Lively Tackpad",
    "New Blissful Tackpad",
    "New Charming Tackpad",
    "New Uplifting Tackpad",
    "New Inspiring Tackpad",
    "New Thrilling Tackpad",
    "New Unstoppable Tackpad",
    "New Victorious Tackpad",
    "New Triumphant Tackpad",
    "New Legendary Tackpad",
    "New Visionary Tackpad",
    "New Boundless Tackpad",
    "New Innovative Tackpad",
    "New Harmonious Tackpad",
    "New Prolific Tackpad",
    "New Ingenious Tackpad",
    "New Cosmic Tackpad",
    "New Imaginative Tackpad",
    "New Strategic Tackpad",
    "New Inventive Tackpad",
    "New Flourishing Tackpad",
    "New Authentic Tackpad",
    "New Flowing Tackpad",
    "New Spirited Tackpad",
    "New Captivating Tackpad",
    "New Pristine Tackpad",
    "New Motivated Tackpad",
    "New Resourceful Tackpad",
    "New Ambitious Tackpad",
    "New Illuminating Tackpad",
    "New Compelling Tackpad",
    "New Trailblazing Tackpad",
    "New Masterful Tackpad",
    "New Limitless Tackpad",
    "New Empowering Tackpad",
    "New Purposeful Tackpad",
    "New Insightful Tackpad",
    "New Thoughtful Tackpad",
    "New Productive Tackpad",
    "New Crystalline Tackpad",
    "New Transcendent Tackpad",
    "New Unified Tackpad",
    "New Expressive Tackpad",
    "New Determined Tackpad",
    "New Exceptional Tackpad",
    "New Fervent Tackpad",
    "New Astounding Tackpad",
    "New Nimble Tackpad",
    "New Progressive Tackpad",
    "New Confident Tackpad",
    "New Robust Tackpad",
    "New Immaculate Tackpad",
    "New Refreshing Tackpad",
    "New Versatile Tackpad",
    "New Intuitive Tackpad",
    "New Profound Tackpad",
    "New Eloquent Tackpad",
    "New Remarkable Tackpad",
    "New Decisive Tackpad",
    "New Enlightening Tackpad",
    "New Prestigious Tackpad",
    "New Vivid Tackpad"
]

const tackpadIcons = [
    "✨", "⭐️", "🌟", "🚀", "💡", "🎉", "🏆", "💎", "💫"
  ];

  const personalities = [
    "🧠 Einstein's",
    "📜 Shakespeare's",
    "🔍 Sherlock's",
    "🎨 Picasso's",
    "⚡ Tesla's",
    "🖌️ Da Vinci's",
    "🎵 Mozart's",
    "⚗️ Marie Curie's",
    "🌺 Frida Kahlo's",
    "🍎 Newton's",
    "🏛️ Aristotle's",
    "🧙 Tolkien's",
    "💌 Austen's",
    "🌻 Van Gogh's",
    "🐢 Darwin's",
    "🎣 Hemingway's",
    "🎹 Beethoven's",
    "🌌 Hawking's",
    "💭 Plato's",
    "⚡ Rowling's",
    "💡 Edison's",
    "👑 Cleopatra's",
    "🏺 Socrates'",
    "💻 Alan Turing's",
    "🌲 Bob Ross'",
    "🔪 Agatha Christie's",
    "📱 Steve Jobs'",
    "🧲 Nikola Tesla's",
    "💥 Oppenheimer's"
];

// Descriptors for personalities
const descriptors = [
    "Mind Palace",
    "Brilliant Mess",
    "Drawing Board",
    "Secret",
    "Hidden",
    "Creative Space",
    "Lost Manuscript",
    "Brainstorm Session",
    "Genius Hour",
    "Thought Experiment",
    "Sketchbook",
    "Master Plan",
    "Unfiltered Ideas",
    "Midnight Thoughts",
    "Workshop",
    "Private",
    "Digital",
    "Inspiration",
    "Problem-Solving",
    "Thinking",
    "Imagination Playground",
    "Reflections",
    "Ideas"
];

  export function getRandomBoardName() {
    // Randomly decide between basic names and personality names
    const usePersonalityStyle = Math.random() > 0.5;
    
    // Get a random icon (only used for basic names)
    const icon = tackpadIcons[Math.floor(Math.random() * tackpadIcons.length)];
    
    if (usePersonalityStyle) {
        // Personality-based name
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
        
        // Personality strings already include emojis
        return `${personality} ${descriptor} Tackpad`;
    } else {
        // Basic adjective-based name
        const name = basicNames[Math.floor(Math.random() * basicNames.length)];
        return `${icon} ${name}`;
    }
}