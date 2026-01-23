// seedItems.js
// Run this once with: node seedItems.js  (or seedItems.mjs if you use ESM)

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Items');   // Adjust path if this file is not in server/ root

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Store Items Data – matched to your Item schema
const storeItems = [
  // FOOD
  {
    sku: 'food-apple',
    name: 'Apple',
    category: 'food',
    price: 20,
    emoji: '🍎',
    description: 'A fresh apple – restores a bit of life',
    effects: { lifeRestore: 1 },     // optional – if you plan to use it later
    consumable: true,
    stackable: true
  },
  {
    sku: 'food-fish',
    name: 'Grilled Fish',
    category: 'food',
    price: 35,
    emoji: '🐟',
    description: 'A hearty grilled fish meal – good recovery',
    effects: { lifeRestore: 2 },
    consumable: true,
    stackable: true
  },
  {
    sku: 'food-cake',
    name: 'Berry Cake',
    category: 'food',
    price: 60,
    emoji: '🍰',
    description: 'Sweet berry cake – delicious and restoring',
    effects: { lifeRestore: 3 },
    consumable: true,
    stackable: true
  },

  // PLAY
  {
    sku: 'play-ball',
    name: 'Bouncy Ball',
    category: 'play',
    price: 25,
    emoji: '🟣',
    description: 'A fun bouncy ball – increases happiness',
    effects: { happiness: 1 },
    consumable: true,
    stackable: true
  },
  {
    sku: 'play-rope',
    name: 'Rope Toy',
    category: 'play',
    price: 30,
    emoji: '🪢',
    description: 'Sturdy rope toy for tugging fun',
    effects: { happiness: 2 },
    consumable: true,
    stackable: true
  },
  {
    sku: 'play-kite',
    name: 'Kite',
    category: 'play',
    price: 45,
    emoji: '🪁',
    description: 'Colorful kite for outdoor play',
    effects: { happiness: 3 },
    consumable: true,
    stackable: true
  },

  // WATER
  {
    sku: 'water-bottle',
    name: 'Spring Water',
    category: 'water',
    price: 15,
    emoji: '💧',
    description: 'Pure spring water – basic hydration',
    effects: { lifeRestore: 1 },
    consumable: true,
    stackable: true
  },
  {
    sku: 'water-juice',
    name: 'Fruit Juice',
    category: 'water',
    price: 28,
    emoji: '🧃',
    description: 'Refreshing fruit juice – tasty boost',
    effects: { lifeRestore: 2 },
    consumable: true,
    stackable: true
  },

  // MEDICINE
  {
    sku: 'med-bandage',
    name: 'Bandage',
    category: 'medicine',
    price: 40,
    emoji: '🩹',
    description: 'Heals small wounds quickly',
    effects: { lifeRestore: 3 },
    consumable: true,
    stackable: true
  },
  {
    sku: 'med-potion',
    name: 'Potion',
    category: 'medicine',
    price: 85,
    emoji: '🧪',
    description: 'Powerful healing potion – strong recovery',
    effects: { lifeRestore: 5 },
    consumable: true,
    stackable: true
  }
];

// Seed Function
const seedItems = async () => {
  try {
    // Optional: Clear existing items first (careful – only for development!)
    // Comment out if you want to add without deleting
    await Item.deleteMany({});
    console.log('Cleared previous store items');

    // Insert the new items
    const inserted = await Item.insertMany(storeItems);
    
    console.log(`✅ Successfully seeded ${inserted.length} store items`);
    console.log('Sample item:', inserted[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding store items:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
};

seedItems();