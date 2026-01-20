// server/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const inventoryRoutes = require('./routes/inventory');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// Middleware
const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/inventory', inventoryRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/buddydoro')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Test route
app.get('/', (req, res) => {
  res.send('BuddyDoro server is running!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

