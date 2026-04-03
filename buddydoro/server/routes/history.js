const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const FocusSession  = require('../models/FocusSession');
const SessionRecord = require('../models/SessionRecord');

// POST /api/history/sessions — save one focus-interval record
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const { subtaskName, taskName, seconds, completedAt } = req.body;
    if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
      return res.status(400).json({ error: 'seconds must be a positive number' });
    }
    const doc = await FocusSession.create({
      userId:      req.user.userId,
      subtaskName: subtaskName || 'Unassigned',
      taskName:    taskName    || '',
      seconds:     Math.round(seconds),
      completedAt: completedAt ? new Date(completedAt) : new Date(),
    });
    res.status(201).json({ id: doc._id.toString() });
  } catch (err) {
    console.error('POST /history/sessions error:', err);
    res.status(500).json({ error: 'Failed to save focus session' });
  }
});

// GET /api/history/sessions — fetch all focus-interval records
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const docs = await FocusSession
      .find({ userId: req.user.userId })
      .sort({ completedAt: 1 });
    res.json(docs.map(s => ({
      subtaskName: s.subtaskName,
      taskName:    s.taskName,
      seconds:     s.seconds,
      completedAt: s.completedAt.toISOString(),
    })));
  } catch (err) {
    console.error('GET /history/sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch focus sessions' });
  }
});

// POST /api/history/records — save one goal-level session record
router.post('/records', authMiddleware, async (req, res) => {
  try {
    const { goalName, pomodorosCompleted, totalSeconds, goalComplete, completedAt } = req.body;
    await SessionRecord.create({
      userId:             req.user.userId,
      goalName:           goalName || 'Unknown Goal',
      pomodorosCompleted: pomodorosCompleted || 0,
      totalSeconds:       Math.round(totalSeconds || 0),
      goalComplete:       !!goalComplete,
      completedAt:        completedAt ? new Date(completedAt) : new Date(),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /history/records error:', err);
    res.status(500).json({ error: 'Failed to save session record' });
  }
});

// GET /api/history/records — fetch all goal-level session records
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const docs = await SessionRecord
      .find({ userId: req.user.userId })
      .sort({ completedAt: 1 });
    res.json(docs.map(r => ({
      goalName:           r.goalName,
      pomodorosCompleted: r.pomodorosCompleted,
      totalSeconds:       r.totalSeconds,
      goalComplete:       r.goalComplete,
      completedAt:        r.completedAt.toISOString(),
    })));
  } catch (err) {
    console.error('GET /history/records error:', err);
    res.status(500).json({ error: 'Failed to fetch session records' });
  }
});

module.exports = router;
