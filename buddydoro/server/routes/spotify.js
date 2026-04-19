/**
 * Spotify OAuth & Token Routes
 *
 * Handles the full Authorization Code flow so users can connect their
 * Spotify Premium account and stream music inside BuddyDoro via the
 * Web Playback SDK.
 *
 * Endpoints:
 *   GET  /api/spotify/login       — Redirects browser to Spotify authorize page (optional return_to= loopback URL)
 *   GET  /api/spotify/callback    — Receives auth code, exchanges for tokens
 *   GET  /api/spotify/token       — Returns a fresh access token to the frontend
 *   GET  /api/spotify/me/playlists — Proxies playlist list (avoids browser CORS to Spotify)
 *   GET  /api/spotify/me/player/devices — Proxies device list (Postman: get device_id without DevTools)
 *   PUT  /api/spotify/player      — Proxies transfer playback (PUT /v1/me/player)
 *   PUT  /api/spotify/player/play — Proxies start playback (PUT /v1/me/player/play)
 *   POST /api/spotify/disconnect  — Clears stored tokens for the user
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require('../authMiddleware');
const User = require('../models/User');

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} = process.env;

/** Short random `state` → Buddy JWT for OAuth (do not put the JWT in Spotify's state — too long for URLs). */
const pendingSpotifyOAuth = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; 

function pruneSpotifyOAuthPending() {
  const now = Date.now();
  for (const [key, entry] of pendingSpotifyOAuth.entries()) {
    if (entry.expires <= now) pendingSpotifyOAuth.delete(key);
  }
}

/** Dev-safe redirect target: only loopback, so OAuth returns to the same tab origin (localStorage). */
function safeReturnTo(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    try {
      u = new URL(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return null;
  return `${u.origin}${u.pathname}`;
}

function defaultFrontendBase() {
  const fe = (process.env.FRONTEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  return fe.startsWith('http') ? fe : `http://127.0.0.1:3000`;
}

function redirectToApp(res, base, params) {
  let u;
  try {
    u = new URL(base);
  } catch {
    u = new URL(defaultFrontendBase());
  }
  u.search = '';
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  res.redirect(u.toString());
}

// #region agent log
// NDJSON + same line to stdout (terminal) so evidence exists if file path differs on disk.
const DBG_SPOTIFY_LOG = path.join(__dirname, '..', 'spotify-debug-3a8ea7.ndjson');
function writeSpotifyDebugLine(ev) {
  const line = JSON.stringify({ sessionId: '3a8ea7', timestamp: Date.now(), ...ev });
  try {
    fs.appendFileSync(DBG_SPOTIFY_LOG, `${line}\n`);
  } catch (err) {
    console.error('[spotify-debug] file write failed:', err && err.message);
  }
  console.log('[spotify-debug]', line);
}
writeSpotifyDebugLine({
  hypothesisId: 'H-boot',
  message: 'spotify_routes_loaded',
  data: { dbgRel: 'spotify-debug-3a8ea7.ndjson' },
});
function dbgSpotifyOAuth(ev) {
  writeSpotifyDebugLine(ev);
}
// #endregion

// Scopes the app requests from Spotify.
// "streaming" + "user-read-email" are required by the Web Playback SDK.
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
].join(' ');

/**
 * Ensures user.spotify has a valid access token, refreshing if needed.
 * Mutates and saves `user` when a refresh occurs.
 * @returns {Promise<string>} Spotify access token
 */
async function ensureFreshSpotifyAccessToken(user) {
  if (!user?.spotify?.connected) {
    const err = new Error('Spotify not connected');
    err.statusCode = 400;
    throw err;
  }

  const needsRefresh =
    !user.spotify.expiresAt || new Date() >= new Date(user.spotify.expiresAt.getTime() - 60000);

  if (needsRefresh) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.spotify.refreshToken,
    });

    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: body.toString(),
    });

    if (!refreshRes.ok) {
      user.spotify.connected = false;
      await user.save();
      const err = new Error('Spotify session expired. Please reconnect.');
      err.statusCode = 401;
      throw err;
    }

    const data = await refreshRes.json();
    user.spotify.accessToken = data.access_token;
    user.spotify.expiresAt = new Date(Date.now() + data.expires_in * 1000);
    if (data.refresh_token) user.spotify.refreshToken = data.refresh_token;
    await user.save();
  }

  return user.spotify.accessToken;
}

/* ------------------------------------------------------------------ */
/*  GET /login — kick off Spotify OAuth                                */
/* ------------------------------------------------------------------ */
router.get('/login', (req, res) => {
  // The frontend passes the BuddyDoro JWT as a query param so we can
  // identify the user when Spotify redirects back to /callback.
  // #region agent log
  dbgSpotifyOAuth({
    hypothesisId: 'H-login-req',
    location: 'spotify.js:/login',
    message: 'login_request',
    data: {
      hasBuddyToken: Boolean(req.query.token),
      hasReturnTo: Boolean(req.query.return_to),
      envSpotifyOk: Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_REDIRECT_URI && SPOTIFY_CLIENT_SECRET),
    },
  });
  // #endregion
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI || !SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ message: 'Spotify is not configured on the server (check .env).' });
  }

  const buddyToken = req.query.token;
  if (!buddyToken) {
    return res.status(400).json({ message: 'Missing auth token' });
  }

  try {
    jwt.verify(buddyToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  pruneSpotifyOAuthPending();
  const oauthState = crypto.randomBytes(16).toString('hex');
  const returnTo = safeReturnTo(req.query.return_to);
  pendingSpotifyOAuth.set(oauthState, {
    token: String(buddyToken),
    expires: Date.now() + OAUTH_STATE_TTL_MS,
    returnTo: returnTo || undefined,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: oauthState,
    show_dialog: 'true',
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

/* ------------------------------------------------------------------ */
/*  GET /callback — Spotify redirects here after user approves         */
/* ------------------------------------------------------------------ */
router.get('/callback', async (req, res) => {
  const { code, state: oauthState, error: spotifyError } = req.query;
  const feFallback = defaultFrontendBase();

  pruneSpotifyOAuthPending();
  const pending = oauthState && pendingSpotifyOAuth.get(String(oauthState));
  const base = (pending && pending.returnTo) || feFallback;

  // #region agent log
  dbgSpotifyOAuth({
    hypothesisId: 'H-callback',
    location: 'spotify.js:/callback',
    message: 'callback_entry',
    data: {
      hasPending: Boolean(pending),
      hasReturnTo: Boolean(pending && pending.returnTo),
      hasSpotifyError: Boolean(spotifyError),
      hasCode: Boolean(code),
      pendingExpired: Boolean(pending && pending.expires <= Date.now()),
    },
  });
  // #endregion

  if (spotifyError) {
    if (pending) pendingSpotifyOAuth.delete(String(oauthState));
    return redirectToApp(res, base, { spotifyError: spotifyError });
  }

  if (!code) {
    if (pending) pendingSpotifyOAuth.delete(String(oauthState));
    return redirectToApp(res, base, { spotifyError: 'missing_authorization_code' });
  }

  if (!pending || pending.expires <= Date.now()) {
    return redirectToApp(res, base, { spotifyError: 'oauth_session_expired' });
  }

  pendingSpotifyOAuth.delete(String(oauthState));

  let userId;
  try {
    const decoded = jwt.verify(pending.token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).send('Invalid or expired session. Please log in again.');
  }

  // Exchange the authorization code for access + refresh tokens.
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Basic auth = base64(client_id:client_secret)
        Authorization:
          'Basic ' +
          Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Spotify token exchange failed:', errBody);
      // #region agent log
      dbgSpotifyOAuth({
        hypothesisId: 'H-token',
        location: 'spotify.js:/callback',
        message: 'token_exchange_http',
        data: { status: tokenRes.status, bodyLen: errBody.length },
      });
      // #endregion
      return redirectToApp(res, base, { spotifyError: 'token_exchange_failed' });
    }

    const data = await tokenRes.json();

    // Persist tokens — merge so we do not wipe refreshToken if Spotify omits it on re-link.
    const user = await User.findById(userId);
    if (!user) {
      return redirectToApp(res, base, { spotifyError: 'user_not_found' });
    }
    if (!user.spotify) user.spotify = {};
    user.spotify.accessToken = data.access_token;
    user.spotify.expiresAt = new Date(Date.now() + data.expires_in * 1000);
    user.spotify.connected = true;
    if (data.refresh_token) {
      user.spotify.refreshToken = data.refresh_token;
    }
    await user.save();

    // #region agent log
    dbgSpotifyOAuth({
      hypothesisId: 'H-save',
      location: 'spotify.js:/callback',
      message: 'spotify_tokens_saved',
      data: { hasRefresh: Boolean(user.spotify.refreshToken) },
    });
    // #endregion

    return redirectToApp(res, base, { spotifyConnected: 'true' });
  } catch (err) {
    console.error('Spotify callback error:', err);
    // #region agent log
    dbgSpotifyOAuth({
      hypothesisId: 'H-catch',
      location: 'spotify.js:/callback',
      message: 'callback_catch',
      data: { errName: err && err.name },
    });
    // #endregion
    return redirectToApp(res, base, { spotifyError: 'server_error' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /token — return a fresh Spotify access token to the frontend   */
/* ------------------------------------------------------------------ */
router.get('/token', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const accessToken = await ensureFreshSpotifyAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    if (err.statusCode === 401) {
      return res.status(401).json({ message: err.message });
    }
    console.error('Spotify /token error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------------------------------------------ */
/*  Proxies — Spotify Web API is not reliably callable from browsers   */
/*  (CORS). The SDK still needs /token for playback; REST goes here.   */
/* ------------------------------------------------------------------ */
router.get('/me/playlists', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const accessToken = await ensureFreshSpotifyAccessToken(user);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const text = await spotifyRes.text();
    if (!spotifyRes.ok) {
      return res.status(spotifyRes.status).json({
        message: 'Spotify API error',
        detail: text.slice(0, 400),
      });
    }
    res.json(JSON.parse(text));
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    if (err.statusCode === 401) {
      return res.status(401).json({ message: err.message });
    }
    console.error('Spotify /me/playlists error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me/player/devices', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const accessToken = await ensureFreshSpotifyAccessToken(user);
    const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const text = await spotifyRes.text();
    if (!spotifyRes.ok) {
      return res.status(spotifyRes.status).json({
        message: 'Spotify API error',
        detail: text.slice(0, 400),
      });
    }
    res.json(JSON.parse(text));
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    if (err.statusCode === 401) {
      return res.status(401).json({ message: err.message });
    }
    console.error('Spotify /me/player/devices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/player/play', authenticateToken, async (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId) {
    return res.status(400).json({ message: 'device_id query param required' });
  }
  try {
    const user = await User.findById(req.user.userId);
    const accessToken = await ensureFreshSpotifyAccessToken(user);
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body && Object.keys(req.body).length ? req.body : {}),
      },
    );
    if (!spotifyRes.ok) {
      const t = await spotifyRes.text();
      return res.status(spotifyRes.status).json({
        message: 'Spotify API error',
        detail: t.slice(0, 400),
      });
    }
    res.status(204).end();
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    if (err.statusCode === 401) {
      return res.status(401).json({ message: err.message });
    }
    console.error('Spotify /player/play error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/player', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const accessToken = await ensureFreshSpotifyAccessToken(user);
    const spotifyRes = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });
    if (!spotifyRes.ok) {
      const t = await spotifyRes.text();
      return res.status(spotifyRes.status).json({
        message: 'Spotify API error',
        detail: t.slice(0, 400),
      });
    }
    res.status(spotifyRes.status === 204 ? 204 : 200).end();
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    if (err.statusCode === 401) {
      return res.status(401).json({ message: err.message });
    }
    console.error('Spotify PUT /player error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /disconnect — clear Spotify tokens for the user               */
/* ------------------------------------------------------------------ */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      spotify: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        connected: false,
      },
    });
    res.json({ message: 'Spotify disconnected' });
  } catch (err) {
    console.error('Spotify disconnect error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
