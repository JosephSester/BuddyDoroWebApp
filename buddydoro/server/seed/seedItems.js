/**
 * Seed script — consumable items (food, play, water, medicine).
 * Run from the project root:  node buddydoro/server/seed/seedItems.js
 * Safe to re-run: uses upsert so existing items are updated, not duplicated.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item     = require('../models/Items');

// SKUs to remove from the DB (retired / replaced items)
const RETIRE_SKUS = ['spring_water', 'apple'];

const ITEMS = [

  // ── Food (restore hunger) ────────────────────────────────────────────────
  // Doros
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
  // Diamonds
  {
    sku: 'golden_apple',
    name: 'Golden Apple',
    category: 'food',
    currency: 'diamonds',
    price: 1,
    emoji: '🥭',
    description: 'A shimmering enchanted apple. Restores a solid amount of hunger instantly.',
    effect: { stat: 'hunger', amount: 5 },
  },
  {
    sku: 'cosmic_berry',
    name: 'Cosmic Berry',
    category: 'food',
    currency: 'diamonds',
    price: 2,
    emoji: '🫐',
    description: 'A berry from another realm. Restores most of your companion\'s hunger.',
    effect: { stat: 'hunger', amount: 10 },
  },
  {
    sku: 'mythic_feast',
    name: 'Mythic Feast',
    category: 'food',
    currency: 'diamonds',
    price: 4,
    emoji: '🥘',
    description: 'A legendary banquet. Fully restores hunger in an instant.',
    effect: { stat: 'hunger', amount: 14 },
  },

  // ── Play (restore happiness) ─────────────────────────────────────────────
  // Doros
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
  // Diamonds
  {
    sku: 'star_prism',
    name: 'Star Prism',
    category: 'play',
    currency: 'diamonds',
    price: 1,
    emoji: '🔮',
    description: 'A prismatic gem that dances with light. Boosts your companion\'s happiness.',
    effect: { stat: 'happiness', amount: 5 },
  },
  {
    sku: 'moonlight_crystal',
    name: 'Moonlight Crystal',
    category: 'play',
    currency: 'diamonds',
    price: 2,
    emoji: '🌙',
    description: 'A shard of crystallised moonlight. Fills your companion with joy.',
    effect: { stat: 'happiness', amount: 10 },
  },
  {
    sku: 'dream_harp',
    name: 'Dream Harp',
    category: 'play',
    currency: 'diamonds',
    price: 4,
    emoji: '🎵',
    description: 'A harp that plays songs from dreams. Fully restores happiness.',
    effect: { stat: 'happiness', amount: 14 },
  },

  // ── Water (restore thirst) ───────────────────────────────────────────────
  // Doros — keeping the original 15-doro Spring Water (sku: water-bottle)
  {
    sku: 'water-bottle',
    name: 'Spring Water',
    category: 'water',
    currency: 'doros',
    price: 15,
    emoji: '💧',
    description: 'Pure spring water. Quenches a little thirst.',
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
  // Diamonds
  {
    sku: 'nectar_drop',
    name: 'Nectar Drop',
    category: 'water',
    currency: 'diamonds',
    price: 1,
    emoji: '🍯',
    description: 'A drop of pure nectar. Quenches a decent amount of thirst.',
    effect: { stat: 'thirst', amount: 5 },
  },
  {
    sku: 'starlight_brew',
    name: 'Starlight Brew',
    category: 'water',
    currency: 'diamonds',
    price: 2,
    emoji: '🧋',
    description: 'A luminous drink brewed from stardust. Greatly quenches thirst.',
    effect: { stat: 'thirst', amount: 10 },
  },
  {
    sku: 'ambrosia',
    name: 'Ambrosia',
    category: 'water',
    currency: 'diamonds',
    price: 4,
    emoji: '🍹',
    description: 'The drink of legends. Fully restores thirst in a single sip.',
    effect: { stat: 'thirst', amount: 14 },
  },

  // ── Medicine (restore health) ────────────────────────────────────────────
  // Doros
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
  // Diamonds
  {
    sku: 'healing_crystal',
    name: 'Healing Crystal',
    category: 'medicine',
    currency: 'diamonds',
    price: 1,
    emoji: '💠',
    description: 'A crystal humming with healing energy. Restores a solid amount of health.',
    effect: { stat: 'health', amount: 5 },
  },
  {
    sku: 'phoenix_tear',
    name: 'Phoenix Tear',
    category: 'medicine',
    currency: 'diamonds',
    price: 2,
    emoji: '🔥',
    description: 'A tear shed by a phoenix. Greatly restores your companion\'s health.',
    effect: { stat: 'health', amount: 10 },
  },
  {
    sku: 'golden_elixir',
    name: 'Golden Elixir',
    category: 'medicine',
    currency: 'diamonds',
    price: 3,
    emoji: '🥃',
    description: 'A legendary elixir. Fully restores health instantly.',
    effect: { stat: 'health', amount: 14 },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Remove retired items
  if (RETIRE_SKUS.length) {
    await Item.deleteMany({ sku: { $in: RETIRE_SKUS } });
    console.log(`  🗑  Retired: ${RETIRE_SKUS.join(', ')}`);
  }

  for (const item of ITEMS) {
    await Item.findOneAndUpdate(
      { sku: item.sku },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${item.sku} (${item.currency === 'diamonds' ? `💎 ${item.price}` : `🪙 ${item.price}`})`);
  }

  console.log(`\nDone — ${ITEMS.length} consumable items seeded.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
