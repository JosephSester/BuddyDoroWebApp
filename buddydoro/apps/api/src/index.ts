// ============================================================
// BACKEND API SERVER
// Location: apps/api/src/index.ts
// Purpose: Server that receives requests from the frontend
// Run: npm run dev (inside apps/api)
// Listens on: http://localhost:3001
// ============================================================

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allows frontend to talk to backend
app.use(express.json()); // Allows reading JSON data from requests

// ========================================
// YOUR FIRST API ENDPOINT - START HERE! 
// ========================================

// Test endpoint - Visit http://localhost:3001 to see if it works
app.get('/', (req, res) => {
    res.json({
        message: 'BuddyDoro API is running!',
        timestamp: new Date().toISOString()
    });
});

// ========================================
// TASKS API - Your First Real Feature
// ========================================

// Temporary in-memory storage (we'll add a real database later)
let tasks: any[] = [];

// GET all tasks
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

// POST create a new task
app.post('/api/tasks', (req, res) => {
    const newTask = {
        id: Date.now().toString(),
        text: req.body.text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

// PUT update a task
app.put('/api/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
    res.json(tasks[taskIndex]);
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    tasks = tasks.filter(t => t.id !== taskId);
    res.json({ message: 'Task deleted' });
});

// ========================================
// TIMER API - Session Management
// ========================================

interface TimerSession {
    id: string;
    userId?: string;
    startTime: string;
    duration: number;
    type: 'focus' | 'break';
    completed: boolean;
}

let sessions: TimerSession[] = [];

// POST start a timer session
app.post('/api/timer/start', (req, res) => {
    const session: TimerSession = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        duration: req.body.duration || 25, // default 25 minutes
        type: req.body.type || 'focus',
        completed: false
    };
    sessions.push(session);
    res.status(201).json(session);
});

// POST complete a timer session
app.post('/api/timer/:id/complete', (req, res) => {
    const sessionId = req.params.id;
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.completed = true;
    res.json(session);
});

// GET timer statistics
app.get('/api/timer/stats', (req, res) => {
    const completedSessions = sessions.filter(s => s.completed);
    const totalFocusTime = completedSessions
        .filter(s => s.type === 'focus')
        .reduce((sum, s) => sum + s.duration, 0);

    res.json({
        totalSessions: completedSessions.length,
        totalFocusMinutes: totalFocusTime,
        totalDoros: completedSessions.filter(s => s.type === 'focus').length
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 BuddyDoro API running on http://localhost:${PORT}`);
    console.log(`📝 Test it: http://localhost:${PORT}`);
    console.log(`📋 Tasks endpoint: http://localhost:${PORT}/api/tasks`);
});
