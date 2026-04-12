// server/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const panelRoutes = require('./routes/panels');
const inventoryRoutes = require('./routes/inventory');
const ItemsRoutes = require('./routes/items');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/user');
const stripeRoutes = require('./routes/stripe');
const historyRoutes = require('./routes/history');
const resourceRoutes = require('./routes/resources');
const pathwayRoutes  = require('./routes/pathway');

const app = express();
app.use(express.json());
app.use(cors());

// Request logger
app.use((req, res, next) => {
  const send = res.json.bind(res);
  res.json = (body) => {
    console.log(`${req.method} ${req.path} → ${res.statusCode} | Auth: ${req.headers.authorization ? 'present' : 'MISSING'}`);
    return send(body);
  };
  next();
});

const PORT = 3000;

// Middleware
const protectedRoutes = require('./routes/protected');
app.use('/api/protected', protectedRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/items', ItemsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/pathway',  pathwayRoutes);

const spotifyRoutes = require('./routes/spotify');
app.use('/api/spotify', spotifyRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/buddydoro')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Test route
app.get('/', (req, res) => {
  res.send('BuddyDoro server is running!');
});

// Only start the HTTP server when running locally (not when loaded by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

// Export the app for Vercel serverless
module.exports = app;
