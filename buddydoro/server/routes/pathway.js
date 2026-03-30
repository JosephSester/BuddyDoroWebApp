const express = require('express');
const authMiddleware = require('../authMiddleware');
const Panel = require('../models/Panel');
const Task = require('../models/Task');

const router = express.Router();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Default starter tasks added to every imported course panel
const STARTER_TASKS = [
    'Review syllabus and course schedule',
    'Complete readings and take notes',
    'Finish and submit assignments',
    'Prepare for midterm exam',
    'Prepare for final exam',
];

function extractJson(content) {
    if (typeof content !== 'string') return null;
    try { return JSON.parse(content); } catch {}
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch {}
    return null;
}

// ── POST /api/pathway/parse ───────────────────────────────────────────────────
// Accepts { documentText }, returns parsed course list. No DB writes.
router.post('/parse', authMiddleware, async (req, res) => {
    const text = (req.body.documentText || '').toString().trim().slice(0, 12000);
    if (!text) return res.status(400).json({ error: 'documentText is required' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

    const prompt = `You are a university degree plan parser. Extract every course listed in the document below.

Return ONLY valid JSON with this exact shape:
{
  "degree": "Full degree name or empty string",
  "university": "University name or empty string",
  "totalCredits": 120,
  "courses": [
    {
      "name": "Full course name",
      "code": "Course code e.g. CS 101 or empty string",
      "credits": 3,
      "semester": "When taken e.g. Year 1 Fall, Semester 2, Junior Year, or Unscheduled",
      "type": "required"
    }
  ]
}

Rules:
- Extract ALL courses including electives and general education requirements
- "type" must be exactly "required", "elective", or "core"
- If semester placement is unclear, use "Unscheduled"
- Default credits to 3 if not stated
- Do not invent courses that are not in the document

Document:
${text}`;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You return only valid JSON.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI error:', response.status, err);
            return res.status(502).json({ error: 'AI parsing failed. Check your OpenAI key and try again.' });
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        const parsed = extractJson(content);

        if (!parsed?.courses?.length) {
            return res.status(422).json({
                error: 'Could not extract courses. Make sure the document includes a course list, or try pasting the text directly.'
            });
        }

        const courses = parsed.courses.slice(0, 100).map(c => ({
            name: String(c.name || '').trim().slice(0, 120) || 'Unnamed Course',
            code: String(c.code || '').trim().slice(0, 20),
            credits: Math.min(Math.max(Math.round(Number(c.credits) || 3), 0), 12),
            semester: String(c.semester || 'Unscheduled').trim().slice(0, 60),
            type: ['required', 'elective', 'core'].includes(c.type) ? c.type : 'required'
        })).filter(c => c.name);

        res.json({
            degree: String(parsed.degree || '').trim().slice(0, 100),
            university: String(parsed.university || '').trim().slice(0, 100),
            totalCredits: Math.round(Number(parsed.totalCredits) || 0),
            courses
        });
    } catch (err) {
        console.error('POST /api/pathway/parse error:', err);
        res.status(500).json({ error: 'Failed to parse document' });
    }
});

// ── POST /api/pathway/import ──────────────────────────────────────────────────
// Accepts { courses }, creates panels + starter tasks in DB.
router.post('/import', authMiddleware, async (req, res) => {
    const courses = Array.isArray(req.body.courses) ? req.body.courses : [];
    if (!courses.length) return res.status(400).json({ error: 'No courses provided' });
    if (courses.length > 60) return res.status(400).json({ error: 'Maximum 60 courses per import' });

    let panelsCreated = 0;
    let tasksCreated = 0;

    const existing = await Panel.find({ userId: req.user.userId }).sort({ order: -1 }).limit(1);
    let nextOrder = existing.length ? existing[0].order + 1 : 0;

    for (const course of courses) {
        const name = String(course.name || '').trim().slice(0, 100);
        if (!name) continue;

        const code = String(course.code || '').trim();
        const panelTitle = code ? `${code} — ${name}` : name;

        const panel = await Panel.create({
            userId: req.user.userId,
            title: panelTitle.slice(0, 100),
            order: nextOrder++
        });
        panelsCreated++;

        for (const taskText of STARTER_TASKS) {
            await Task.create({
                userId: req.user.userId,
                text: taskText,
                panelId: panel._id.toString(),
                completed: false
            });
            tasksCreated++;
        }
    }

    res.json({ panelsCreated, tasksCreated });
});

module.exports = router;
