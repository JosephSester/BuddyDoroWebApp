/**
 * Spotify OAuth & Token Routes
 *
 * Handles the full Authorization Code flow so users can connect their
 * Spotify Premium account and stream music inside BuddyDoro via the
 * Web Playback SDK.
 *
 * Endpoints:
 *   GET  /api/spotify/login       — Redirects browser to Spotify authorize page
 *   GET  /api/spotify/callback    — Receives auth code, exchanges for tokens
 *   GET  /api/spotify/token       — Returns a fresh access token to the frontend
 *   POST /api/spotify/disconnect  — Clears stored tokens for the user
 */

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

/* ------------------------------------------------------------------ */
/*  GET /login — kick off Spotify OAuth                                */
/* ------------------------------------------------------------------ */
router.get('/login', (req, res) => {
  // The frontend passes the BuddyDoro JWT as a query param so we can
  // identify the user when Spotify redirects back to /callback.
  const buddyToken = req.query.token;
  if (!buddyToken) {
    return res.status(400).json({ message: 'Missing auth token' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    // Embed our JWT in the OAuth state so /callback can look up the user.
    state: buddyToken,
    show_dialog: 'true',
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

/* ------------------------------------------------------------------ */
/*  GET /callback — Spotify redirects here after user approves         */
/* ------------------------------------------------------------------ */
router.get('/callback', async (req, res) => {
  const { code, state: buddyToken, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/?spotifyError=${encodeURIComponent(error)}`);
  }

  // Verify the BuddyDoro JWT embedded in the state param.
  let userId;
  try {
    const decoded = jwt.verify(buddyToken, process.env.JWT_SECRET);
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
      return res.redirect(`${process.env.FRONTEND_URL}/?spotifyError=token_exchange_failed`);
    }

    const data = await tokenRes.json();

    // Persist tokens on the user document so we can refresh later.
    await User.findByIdAndUpdate(userId, {
      spotify: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        connected: true,
      },
    });

    // Redirect back to the app with a success flag the frontend can detect.
    res.redirect(`${process.env.FRONTEND_URL}/?spotifyConnected=true`);
  } catch (err) {
    console.error('Spotify callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/?spotifyError=server_error`);
  }
});

/* ------------------------------------------------------------------ */
/*  GET /token — return a fresh Spotify access token to the frontend   */
/* ------------------------------------------------------------------ */
router.get('/token', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.spotify?.connected) {
      return res.status(400).json({ message: 'Spotify not connected' });
    }

    // If the token has expired (or will in the next 60 s), refresh it.
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
        // Refresh failed — mark as disconnected so the user re-authorizes.
        user.spotify.connected = false;
        await user.save();
        return res.status(401).json({ message: 'Spotify session expired. Please reconnect.' });
      }

      const data = await refreshRes.json();
      user.spotify.accessToken = data.access_token;
      user.spotify.expiresAt = new Date(Date.now() + data.expires_in * 1000);
      // Spotify may issue a new refresh token; store it if present.
      if (data.refresh_token) user.spotify.refreshToken = data.refresh_token;
      await user.save();
    }

    res.json({ accessToken: user.spotify.accessToken });
  } catch (err) {
    console.error('Spotify /token error:', err);
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
