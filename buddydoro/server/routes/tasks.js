const express = require('express');
const Task = require('../models/Task');
const authMiddleware = require('../authMiddleware');
const router = express.Router();

// Constants for validation
const MIN_TASK_LENGTH = 1;
const MAX_TASK_LENGTH = 500;

// Validation helper
function validateTaskText(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Task text must be a string' };
    }

    const trimmed = text.trim();

    if (trimmed.length < MIN_TASK_LENGTH) {
        return { valid: false, error: 'Task text cannot be empty' };
    }

    if (trimmed.length > MAX_TASK_LENGTH) {
        return { valid: false, error: `Task text cannot exceed ${MAX_TASK_LENGTH} characters` };
    }

    return { valid: true, text: trimmed };
}

// GET all tasks for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        // Transform _id to id for frontend
        const tasksWithId = tasks.map(task => ({
            id: task._id.toString(),
            text: task.text,
            completed: task.completed,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        res.json(tasksWithId);
    } catch (error) {
        console.error('GET /api/tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// POST create a new task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        // Validate input
        const validation = validateTaskText(text);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const task = new Task({
            userId: req.user.userId,
            text: validation.text,
            completed: false
        });

        await task.save();
        // Transform _id to id for frontend
        res.status(201).json({
            id: task._id.toString(),
            text: task.text,
            completed: task.completed,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
    } catch (error) {
        console.error('POST /api/tasks error:', error);
        res.status(500).json({ error: 'Failed to create task. Please try again.' });
    }
});

// PUT update a task
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Verify ownership
        if (task.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'You do not have permission to update this task' });
        }

        // Update text if provided
        if (req.body.text !== undefined) {
            const validation = validateTaskText(req.body.text);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            task.text = validation.text;
        }

        // Update completed status if provided
        if (req.body.completed !== undefined) {
            if (typeof req.body.completed !== 'boolean') {
                return res.status(400).json({ error: 'Completed must be a boolean' });
            }
            task.completed = req.body.completed;
        }

        task.updatedAt = new Date();
        await task.save();
        // Transform _id to id for frontend
        res.json({
            id: task._id.toString(),
            text: task.text,
            completed: task.completed,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        });
    } catch (error) {
        console.error('PUT /api/tasks/:id error:', error);
        res.status(500).json({ error: 'Failed to update task. Please try again.' });
    }
});

// DELETE a task
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Verify ownership
        if (task.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this task' });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('DELETE /api/tasks/:id error:', error);
        res.status(500).json({ error: 'Failed to delete task. Please try again.' });
    }
});

module.exports = router;
