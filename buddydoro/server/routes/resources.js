const express = require('express');
const authMiddleware = require('../authMiddleware');
const Resource = require('../models/Resource');
const Note = require('../models/Note');
const router = express.Router();

// ─── Search proxy endpoints (no auth required) ───────────────────────────────

// GET /api/resources/search/videos?q=...&maxResults=8
router.get('/search/videos', async (req, res) => {
    const q = (req.query.q || '').trim();
    const maxResults = Math.min(parseInt(req.query.maxResults) || 8, 12);

    if (!q) return res.status(400).json({ error: 'q is required' });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return res.status(501).json({ error: 'YouTube API key not configured' });
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&maxResults=${maxResults}&key=${apiKey}&relevanceLanguage=en&safeSearch=moderate`;
        const response = await fetch(url);
        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err?.error?.message || 'YouTube API error' });
        }
        const data = await response.json();
        const items = (data.items || []).map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: item.snippet.thumbnails?.medium?.url || null,
            channelTitle: item.snippet.channelTitle,
            description: item.snippet.description
        }));
        res.json(items);
    } catch (err) {
        console.error('YouTube search error:', err);
        res.status(500).json({ error: 'Failed to fetch YouTube results' });
    }
});

// GET /api/resources/search/books?q=...&limit=8
router.get('/search/books', async (req, res) => {
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 8, 12);

    if (!q) return res.status(400).json({ error: 'q is required' });

    try {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=title,author_name,key,cover_i,first_sentence&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Open Library error');
        const data = await response.json();
        const items = (data.docs || []).map(doc => ({
            title: doc.title,
            author: doc.author_name?.[0] || null,
            url: `https://openlibrary.org${doc.key}`,
            thumbnail: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                : null,
            description: doc.first_sentence?.[0] || null
        }));
        res.json(items);
    } catch (err) {
        console.error('Open Library search error:', err);
        res.status(500).json({ error: 'Failed to fetch book results' });
    }
});

// GET /api/resources/search/web?q=...
router.get('/search/web', (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });
    res.json({
        googleUrl: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        ddgUrl: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        khanUrl: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(q)}`,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
    });
});

// ─── Saved Resources CRUD (auth required) ─────────────────────────────────────

// GET /api/resources — list user's saved resources
router.get('/', authMiddleware, async (req, res) => {
    try {
        const resources = await Resource.find({ userId: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(resources);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// POST /api/resources — save a resource
router.post('/', authMiddleware, async (req, res) => {
    const { type, title, url, thumbnail, author, note, query } = req.body;
    if (!type || !title || !url) {
        return res.status(400).json({ error: 'type, title, and url are required' });
    }
    if (!['video', 'book', 'web'].includes(type)) {
        return res.status(400).json({ error: 'type must be video, book, or web' });
    }
    try {
        const resource = await Resource.create({
            userId: req.user.userId,
            type, title, url,
            thumbnail: thumbnail || null,
            author: author || null,
            note: note || '',
            query: query || null
        });
        res.status(201).json(resource);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save resource' });
    }
});

// PUT /api/resources/:id — update the annotation note
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ error: 'Resource not found' });
        if (resource.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        resource.note = req.body.note ?? resource.note;
        await resource.save();
        res.json(resource);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update resource' });
    }
});

// DELETE /api/resources/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) return res.status(404).json({ error: 'Resource not found' });
        if (resource.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await resource.deleteOne();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});

// ─── Notes CRUD (auth required) ───────────────────────────────────────────────

// GET /api/resources/notes
router.get('/notes', authMiddleware, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.userId })
            .sort({ updatedAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// POST /api/resources/notes
router.post('/notes', authMiddleware, async (req, res) => {
    const { body, taskId, taskName } = req.body;
    try {
        const note = await Note.create({
            userId: req.user.userId,
            body: body || '',
            taskId: taskId || null,
            taskName: taskName || null
        });
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT /api/resources/notes/:id
router.put('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        note.body = req.body.body ?? note.body;
        note.taskId = req.body.taskId !== undefined ? (req.body.taskId || null) : note.taskId;
        note.taskName = req.body.taskName !== undefined ? (req.body.taskName || null) : note.taskName;
        note.updatedAt = new Date();
        await note.save();
        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// DELETE /api/resources/notes/:id
router.delete('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await note.deleteOne();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;
