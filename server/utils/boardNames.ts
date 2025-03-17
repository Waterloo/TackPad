const names = [
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

export function getRandomBoardName(){

    const randomIndex = Math.floor(Math.random() * names.length);
    const name = names[randomIndex];
    const icon = tackpadIcons[Math.floor(Math.random() * tackpadIcons.length)];
    return `${icon} ${name}`;

}