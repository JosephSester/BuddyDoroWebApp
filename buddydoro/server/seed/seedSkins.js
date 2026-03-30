/**
 * Seed script — companion skins.
 * Run from the project root:  node buddydoro/server/seed/seedSkins.js
 * Safe to re-run: uses upsert so existing items are updated, not duplicated.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item     = require('../models/Items');

const SKINS = [

  // ── Doros ────────────────────────────────────────────────────────────────
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

  // ── Diamonds ─────────────────────────────────────────────────────────────
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
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const item of SKINS) {
    await Item.findOneAndUpdate(
      { sku: item.sku },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${item.sku} (${item.currency === 'diamonds' ? `💎 ${item.price}` : `🪙 ${item.price}`})`);
  }

  console.log(`\nDone — ${SKINS.length} skins seeded.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
