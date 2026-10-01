export const providerSeeds = [
  { name: "Astra Works", slug: "astra-works" },
  { name: "House of V", slug: "house-of-v" },
  { name: "Northstar Studio", slug: "northstar-studio" },
  { name: "Lumen Labs", slug: "lumen-labs" },
  { name: "Veltrix Originals", slug: "veltrix-originals" },
] as const;

export const gameSeeds = [
  { name: "Neon Relics", slug: "neon-relics", description: "Five reels of original relics, bright lines, and server-led demo spins.", category: "SLOTS", providerSlug: "veltrix-originals", featured: true, newGame: true, popular: true, demoRtp: 96.2 },
  { name: "Veltrix Blackjack", slug: "veltrix-blackjack", description: "A focused blackjack table built around clear decisions and fictional VC.", category: "BLACKJACK", providerSlug: "veltrix-originals", featured: true, newGame: true, popular: true, demoRtp: 99.1 },
  { name: "European Roulette", slug: "european-roulette", description: "A single-zero wheel with simple demo bets and a calm neon table.", category: "ROULETTE", providerSlug: "veltrix-originals", featured: true, newGame: true, popular: true, demoRtp: 97.3 },
  { name: "Lunar Circuit", slug: "lunar-circuit", description: "A cool-toned slot run through a bright orbital city.", category: "SLOTS", providerSlug: "astra-works", featured: true, newGame: true, popular: true, demoRtp: 96.4 },
  { name: "Velvet Roulette", slug: "velvet-roulette", description: "An elegant European wheel with a midnight finish.", category: "TABLE_GAMES", providerSlug: "house-of-v", featured: true, newGame: false, popular: true, demoRtp: 97.3 },
  { name: "Signal Blackjack", slug: "signal-blackjack", description: "A focused table with crisp decisions and quiet tension.", category: "TABLE_GAMES", providerSlug: "northstar-studio", featured: true, newGame: false, popular: true, demoRtp: 99.2 },
  { name: "Neon Paddock", slug: "neon-paddock", description: "Arcade momentum, quick rounds and a playful night drive.", category: "ARCADE", providerSlug: "lumen-labs", featured: true, newGame: true, popular: false, demoRtp: 95.8 },
  { name: "Orbit Reels", slug: "orbit-reels", description: "Find your line through a constellation of small wins.", category: "SLOTS", providerSlug: "astra-works", featured: false, newGame: false, popular: true, demoRtp: 96.1 },
  { name: "Gilded Dice", slug: "gilded-dice", description: "A compact dice table designed for a quick ritual.", category: "TABLE_GAMES", providerSlug: "house-of-v", featured: false, newGame: true, popular: false, demoRtp: 96.8 },
  { name: "Tide Chase", slug: "tide-chase", description: "Ride a teal current and collect the patterns in its wake.", category: "ARCADE", providerSlug: "lumen-labs", featured: false, newGame: true, popular: false, demoRtp: 95.4 },
  { name: "Ember Room", slug: "ember-room", description: "Warm reels, slow reveals and a little more atmosphere.", category: "SLOTS", providerSlug: "northstar-studio", featured: false, newGame: false, popular: true, demoRtp: 96.6 },
  { name: "Afterglow Baccarat", slug: "afterglow-baccarat", description: "A soft neon table for measured, low-noise play.", category: "LIVE_STYLE", providerSlug: "house-of-v", featured: false, newGame: false, popular: true, demoRtp: 98.7 },
  { name: "Cinder Club", slug: "cinder-club", description: "A polished club table with a bright, tactile rhythm.", category: "LIVE_STYLE", providerSlug: "northstar-studio", featured: false, newGame: true, popular: false, demoRtp: 97.8 },
  { name: "Prism Pulse", slug: "prism-pulse", description: "A fast arcade loop built around color and timing.", category: "ARCADE", providerSlug: "lumen-labs", featured: false, newGame: false, popular: true, demoRtp: 95.9 },
  { name: "Moonlit Mint", slug: "moonlit-mint", description: "A fresh spin on the familiar with a cooler palette.", category: "SLOTS", providerSlug: "astra-works", featured: false, newGame: true, popular: false, demoRtp: 96.3 },
] as const;
