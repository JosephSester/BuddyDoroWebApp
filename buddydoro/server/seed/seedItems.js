/**
 * Seed script — populates the Items collection.
 * Run from the project root:  node buddydoro/server/seed/seedItems.js
 * Safe to re-run: uses upsert so existing items are updated, not duplicated.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item     = require('../models/Items');

const ITEMS = [

  // ── Food (restore hunger) ────────────────────────────────────────────────
  {
    sku: 'apple',
    name: 'Apple',
    category: 'food',
    currency: 'doros',
    price: 80,
    emoji: '🍎',
    description: 'A crisp apple. Restores a little hunger.',
    effect: { stat: 'hunger', amount: 2 },
  },
  {
    sku: 'berry_bunch',
    name: 'Berry Bunch',
    category: 'food',
    currency: 'doros',
    price: 160,
    emoji: '🍇',
    description: 'A handful of wild berries. Restores some hunger.',
    effect: { stat: 'hunger', amount: 4 },
  },
  {
    sku: 'roasted_mushroom',
    name: 'Roasted Mushroom',
    category: 'food',
    currency: 'doros',
    price: 280,
    emoji: '🍄',
    description: 'A hearty forest mushroom. Restores a lot of hunger.',
    effect: { stat: 'hunger', amount: 7 },
  },
  {
    sku: 'dragon_feast',
    name: 'Dragon Feast',
    category: 'food',
    currency: 'doros',
    price: 450,
    emoji: '🍖',
    description: 'A royal meal fit for a companion. Fully restores hunger.',
    effect: { stat: 'hunger', amount: 14 },
  },

  // ── Play (restore happiness) ─────────────────────────────────────────────
  {
    sku: 'bouncy_ball',
    name: 'Bouncy Ball',
    category: 'play',
    currency: 'doros',
    price: 100,
    emoji: '⚽',
    description: 'A simple ball to chase around. Boosts happiness a little.',
    effect: { stat: 'happiness', amount: 3 },
  },
  {
    sku: 'crystal_spinner',
    name: 'Crystal Spinner',
    category: 'play',
    currency: 'doros',
    price: 220,
    emoji: '🌀',
    description: 'A sparkling toy that captivates your companion.',
    effect: { stat: 'happiness', amount: 6 },
  },
  {
    sku: 'enchanted_toy',
    name: 'Enchanted Toy',
    category: 'play',
    currency: 'doros',
    price: 380,
    emoji: '🪄',
    description: 'A magical toy that brings endless delight. Fully restores happiness.',
    effect: { stat: 'happiness', amount: 14 },
  },

  // ── Water (restore thirst) ───────────────────────────────────────────────
  {
    sku: 'spring_water',
    name: 'Spring Water',
    category: 'water',
    currency: 'doros',
    price: 80,
    emoji: '💧',
    description: 'Fresh water from a mountain spring. Quenches a little thirst.',
    effect: { stat: 'thirst', amount: 2 },
  },
  {
    sku: 'mystic_potion',
    name: 'Mystic Potion',
    category: 'water',
    currency: 'doros',
    price: 190,
    emoji: '🧪',
    description: 'A shimmering brew that quenches mid-level thirst.',
    effect: { stat: 'thirst', amount: 5 },
  },
  {
    sku: 'glacier_drop',
    name: 'Glacier Drop',
    category: 'water',
    currency: 'doros',
    price: 320,
    emoji: '🧊',
    description: 'A single drop of ancient glacier. Fully restores thirst.',
    effect: { stat: 'thirst', amount: 14 },
  },

  // ── Medicine (restore health) ────────────────────────────────────────────
  {
    sku: 'herb_pack',
    name: 'Herb Pack',
    category: 'medicine',
    currency: 'doros',
    price: 200,
    emoji: '🌿',
    description: 'A bundle of healing herbs. Restores a little health.',
    effect: { stat: 'health', amount: 3 },
  },
  {
    sku: 'revival_herb',
    name: 'Revival Herb',
    category: 'medicine',
    currency: 'doros',
    price: 480,
    emoji: '🌺',
    description: 'A rare blossom with potent healing. Restores a lot of health.',
    effect: { stat: 'health', amount: 7 },
  },
  {
    sku: 'golden_elixir',
    name: 'Golden Elixir',
    category: 'medicine',
    currency: 'diamonds',
    price: 3,
    emoji: '✨',
    description: 'A legendary elixir. Fully restores health instantly.',
    effect: { stat: 'health', amount: 14 },
  },

  // ── Skins — Doros ────────────────────────────────────────────────────────
  {
    sku: 'skin_axolotl',
    name: 'Axolotl',
    category: 'skins',
    currency: 'doros',
    price: 500,
    emoji: '🦎',
    imageUrl: 'Skins/Axolotyl.png',
  },
  {
    sku: 'skin_capybara',
    name: 'Capybara',
    category: 'skins',
    currency: 'doros',
    price: 600,
    emoji: '🦫',
    imageUrl: 'Skins/Capybara.png',
  },
  {
    sku: 'skin_dragon_alt',
    name: 'Dragon (Alt)',
    category: 'skins',
    currency: 'doros',
    price: 800,
    emoji: '🐉',
    imageUrl: 'Skins/DragonSkin.png',
  },
  {
    sku: 'skin_frog',
    name: 'Frog',
    category: 'skins',
    currency: 'doros',
    price: 500,
    emoji: '🐸',
    imageUrl: 'Skins/Frog.png',
  },
  {
    sku: 'skin_praying_mantis',
    name: 'Praying Mantis',
    category: 'skins',
    currency: 'doros',
    price: 650,
    emoji: '🦗',
    imageUrl: 'Skins/PrayingMantis.png',
  },
  {
    sku: 'skin_werewolf',
    name: 'Werewolf',
    category: 'skins',
    currency: 'doros',
    price: 850,
    emoji: '🐺',
    imageUrl: 'Skins/Werewolf.png',
  },

  // ── Skins — Diamonds ─────────────────────────────────────────────────────
  {
    sku: 'skin_alien',
    name: 'Alien',
    category: 'skins',
    currency: 'diamonds',
    price: 4,
    emoji: '👽',
    imageUrl: 'Skins/Alien.png',
  },
  {
    sku: 'skin_butterfly',
    name: 'Butterfly',
    category: 'skins',
    currency: 'diamonds',
    price: 3,
    emoji: '🦋',
    imageUrl: 'Skins/Butterfly.png',
  },
  {
    sku: 'skin_rock_creature',
    name: 'Rock Creature',
    category: 'skins',
    currency: 'diamonds',
    price: 3,
    emoji: '🪨',
    imageUrl: 'Skins/RockCreature.png',
  },
  {
    sku: 'skin_robot',
    name: 'Robot',
    category: 'skins',
    currency: 'diamonds',
    price: 4,
    emoji: '🤖',
    imageUrl: 'Skins/Robot.png',
  },
  {
    sku: 'skin_bigfoot',
    name: 'Bigfoot',
    category: 'skins',
    currency: 'diamonds',
    price: 3,
    emoji: '🦶',
    imageUrl: 'Skins/Bigfoot.png',
  },
  {
    sku: 'skin_strawberry',
    name: 'Strawberry',
    category: 'skins',
    currency: 'diamonds',
    price: 3,
    emoji: '🍓',
    imageUrl: 'Skins/Strawberry.png',
  },
  {
    sku: 'skin_ice_cream',
    name: 'Ice Cream',
    category: 'skins',
    currency: 'diamonds',
    price: 3,
    emoji: '🍦',
    imageUrl: 'Skins/IceCream.png',
  },
  {
    sku: 'skin_vampire',
    name: 'Vampire',
    category: 'skins',
    currency: 'diamonds',
    price: 4,
    emoji: '🧛',
    imageUrl: 'Skins/Vampire.png',
  },

  // ── Backgrounds — Doros ──────────────────────────────────────────────────
  {
    sku: 'bg_african',
    name: 'African',
    category: 'backgrounds',
    currency: 'doros',
    price: 400,
    emoji: '🌍',
    imageUrl: 'Backgrounds/AfricanBackgroundDay.png',
  },
  {
    sku: 'bg_arctic',
    name: 'Arctic',
    category: 'backgrounds',
    currency: 'doros',
    price: 400,
    emoji: '❄️',
    imageUrl: 'Backgrounds/ArcticBackgroundDay.png',
  },
  {
    sku: 'bg_beach',
    name: 'Beach',
    category: 'backgrounds',
    currency: 'doros',
    price: 400,
    emoji: '🏖️',
    imageUrl: 'Backgrounds/BeachBackgroundDay.png',
  },
  {
    sku: 'bg_everglades',
    name: 'Everglades',
    category: 'backgrounds',
    currency: 'doros',
    price: 500,
    emoji: '🌿',
    imageUrl: 'Backgrounds/EvergladesBackgroundDay.png',
  },
  {
    sku: 'bg_inca',
    name: 'Inca',
    category: 'backgrounds',
    currency: 'doros',
    price: 500,
    emoji: '🏛️',
    imageUrl: 'Backgrounds/IncaBackgroundDay.png',
  },
  {
    sku: 'bg_jungle',
    name: 'Jungle',
    category: 'backgrounds',
    currency: 'doros',
    price: 450,
    emoji: '🌴',
    imageUrl: 'Backgrounds/JungleBackgroundDay.png',
  },
  {
    sku: 'bg_mountain',
    name: 'Mountain',
    category: 'backgrounds',
    currency: 'doros',
    price: 400,
    emoji: '⛰️',
    imageUrl: 'Backgrounds/MountainBackgroundDay.png',
  },
  {
    sku: 'bg_rainforest',
    name: 'Rainforest',
    category: 'backgrounds',
    currency: 'doros',
    price: 450,
    emoji: '🌧️',
    imageUrl: 'Backgrounds/RainforestBackgroundDay.png',
  },
  {
    sku: 'bg_dessert_land',
    name: 'Dessert Land',
    category: 'backgrounds',
    currency: 'doros',
    price: 600,
    emoji: '🍰',
    imageUrl: 'Backgrounds/DessertLandBackground.png',
  },

  // ── Backgrounds — Diamonds ───────────────────────────────────────────────
  {
    sku: 'bg_desert',
    name: 'Desert',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 3,
    emoji: '🏜️',
    imageUrl: 'Backgrounds/DesertBackgroundDay.png',
  },
  {
    sku: 'bg_moon',
    name: 'Moon',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 5,
    emoji: '🌕',
    imageUrl: 'Backgrounds/MoonBackground.png',
  },
  {
    sku: 'bg_inner_earth',
    name: 'Inner Earth',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 4,
    emoji: '🌋',
    imageUrl: 'Backgrounds/InnerEarthBackground.png',
  },
  {
    sku: 'bg_mayan',
    name: 'Mayan',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 3,
    emoji: '🗿',
    imageUrl: 'Backgrounds/MayanBackgroundDay.png',
  },
  {
    sku: 'bg_japanese',
    name: 'Japanese',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 4,
    emoji: '🏯',
    imageUrl: 'Backgrounds/JapaneseBackgroundDay.png',
  },
  {
    sku: 'bg_floating_island',
    name: 'Floating Island',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 5,
    emoji: '☁️',
    imageUrl: 'Backgrounds/FloatingIslandBackgroundDay.png',
  },
  {
    sku: 'bg_cemetery',
    name: 'Cemetery',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 3,
    emoji: '🪦',
    imageUrl: 'Backgrounds/CemeteryBackgroundDay.png',
  },
  {
    sku: 'bg_mars',
    name: 'Mars',
    category: 'backgrounds',
    currency: 'diamonds',
    price: 5,
    emoji: '🔴',
    imageUrl: 'Backgrounds/MarsBackgroundDay.png',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let created = 0;
  let updated = 0;

  for (const item of ITEMS) {
    const result = await Item.findOneAndUpdate(
      { sku: item.sku },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
    console.log(`  ✓ ${item.sku} (${item.currency === 'diamonds' ? `💎 ${item.price}` : `🪙 ${item.price}`})`);
  }

  console.log(`\nDone — ${ITEMS.length} items seeded.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
