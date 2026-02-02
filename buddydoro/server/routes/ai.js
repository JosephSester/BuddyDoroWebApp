const express = require('express');
const authMiddleware = require('../authMiddleware');

const router = express.Router();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

const MAX_TASKS = 8;
const MAX_SUBTASKS = 6;
const MAX_TITLE_LEN = 80;
const MAX_DESC_LEN = 240;
const MIN_ESTIMATE = 1;
const MAX_ESTIMATE = 999;
const MIN_SUB_ESTIMATE = 5;
const MAX_SUB_ESTIMATE = 180;

function clampInt(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const intVal = Math.round(num);
    if (intVal < min) return min;
    if (intVal > max) return max;
    return intVal;
}

function sanitizeText(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value.trim();
}

function sanitizePlan(rawPlan, fallbackGoal) {
    const plan = (rawPlan && typeof rawPlan === 'object') ? rawPlan : {};
    const title = sanitizeText(plan.title, fallbackGoal || 'Goal').slice(0, MAX_TITLE_LEN) || 'Goal';
    const description = sanitizeText(plan.description, '').slice(0, MAX_DESC_LEN);

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const sanitizedTasks = tasks.slice(0, MAX_TASKS).map((task, index) => {
        const taskTitle = sanitizeText(task?.title, `Task ${index + 1}`).slice(0, MAX_TITLE_LEN) || `Task ${index + 1}`;
        const estimate = clampInt(task?.estimate, MIN_ESTIMATE, MAX_ESTIMATE, MIN_ESTIMATE);
        const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
        const sanitizedSubtasks = subtasks.slice(0, MAX_SUBTASKS).map((sub, subIndex) => {
            const subTitle = sanitizeText(sub?.title, `Subtask ${subIndex + 1}`).slice(0, MAX_TITLE_LEN) || `Subtask ${subIndex + 1}`;
            const subEstimate = clampInt(sub?.estimate, MIN_SUB_ESTIMATE, MAX_SUB_ESTIMATE, MIN_SUB_ESTIMATE);
            return {
                title: subTitle,
                estimate: subEstimate
            };
        });

        return {
            title: taskTitle,
            estimate,
            subtasks: sanitizedSubtasks
        };
    });

    return {
        title,
        description,
        tasks: sanitizedTasks
    };
}

function extractJson(content) {
    if (typeof content !== 'string') return null;
    try {
        return JSON.parse(content);
    } catch (_err) {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (_err2) {
            return null;
        }
    }
}

router.post('/plan', authMiddleware, async (req, res) => {
    try {
        const goal = sanitizeText(req.body?.goal, '').slice(0, 200);
        if (!goal) {
            return res.status(400).json({ error: 'Goal is required.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'AI service is not configured.' });
        }

        const prompt = `You are a planning assistant. Create a concise, structured plan for the goal below.\n\nGoal: "${goal}"\n\nReturn ONLY valid JSON with this shape:\n{\n  "title": "Short goal title",\n  "description": "One-sentence overview",\n  "tasks": [\n    {\n      "title": "Task title",\n      "estimate": 1,\n      "subtasks": [\n        { "title": "Subtask title", "estimate": 30 }\n      ]\n    }\n  ]\n}\n\nRules:\n- 4-8 tasks maximum.\n- Task estimates are in pomodoro sessions (1-8 typical, max 999).\n- Subtask estimates are in minutes (5-120 typical).\n- Keep titles short and actionable.\n- No extra keys or commentary.`;

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You return only JSON.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('AI API error:', response.status, text);
            return res.status(502).json({ error: 'AI service failed to generate a plan.' });
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        const rawPlan = extractJson(content) || {};
        const plan = sanitizePlan(rawPlan, goal);

        if (!plan.tasks.length) {
            return res.status(502).json({ error: 'AI returned an empty plan.' });
        }

        return res.json(plan);
    } catch (err) {
        console.error('POST /api/ai/plan error:', err);
        return res.status(500).json({ error: 'Failed to generate plan.' });
    }
});

module.exports = router;
