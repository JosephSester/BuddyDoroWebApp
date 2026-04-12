// Vercel Serverless Entry Point
// This file is the bridge between Vercel's serverless runtime and our Express server.
// Vercel automatically routes all /api/* requests here.
const app = require('../server/server.js');
module.exports = app;
