/**
 * Seed script — backgrounds.
 * Run from the project root:  node buddydoro/server/seed/seedBackgrounds.js
 * Safe to re-run: uses upsert so existing items are updated, not duplicated.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item     = require('../models/Items');

const BACKGROUNDS = [

  // ── Doros ────────────────────────────────────────────────────────────────
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

  // ── Diamonds ─────────────────────────────────────────────────────────────
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
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const item of BACKGROUNDS) {
    await Item.findOneAndUpdate(
      { sku: item.sku },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${item.sku} (${item.currency === 'diamonds' ? `💎 ${item.price}` : `🪙 ${item.price}`})`);
  }

  console.log(`\nDone — ${BACKGROUNDS.length} backgrounds seeded.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
