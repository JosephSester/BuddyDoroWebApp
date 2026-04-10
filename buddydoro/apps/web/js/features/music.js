import { AMBIENT_AUDIO, AMBIENT_MODES, BUDDYDORO_TRACKS } from './musicCatalog.js';
import { showNotification } from '../utils/notifications.js';
import { API_BASE } from '../api/apiClient.js';

// Persisted UI/player settings for the music mini-player.
const STORAGE_KEY = 'buddydoro:musicState:v1';

export function initMusic(options = {}) {
  const { timer } = options;
  const chip = document.getElementById('musicChip');
  const panel = document.getElementById('musicMiniPanel');
  const enableToggle = document.getElementById('musicEnabledToggle');
  const enableToggleText = panel.querySelector('.music-toggle-text');
  const prevBtn = document.getElementById('musicPrevBtn');
  const playPauseBtn = document.getElementById('musicPlayPauseBtn');
  const nextBtn = document.getElementById('musicNextBtn');
  const playerTitleEl = document.getElementById('musicPlayerTitle');
  const playerSubtitleEl = document.getElementById('musicPlayerSubtitle');
  const progressSectionEl = document.getElementById('musicProgressSection');
  const progressTrackEl = document.getElementById('musicProgressTrack');
  const progressFillEl = document.getElementById('musicProgressFill');
  const timeElapsedEl = document.getElementById('musicTimeElapsed');
  const timeDurationEl = document.getElementById('musicTimeDuration');
  const playerCardEl = document.getElementById('musicPlayerCard');
  const tracksRoot = document.getElementById('musicTrackList');
  const sourceDefault = document.getElementById('musicSourceDefault');
  const sourceSpotify = document.getElementById('musicSourceSpotify');
  const spotifyConnectBtn = document.getElementById('musicSpotifyConnectBtn');
  const spotifyHint = document.getElementById('musicSpotifyHint');
  const ambientRoot = document.getElementById('musicAmbientList');

  if (
    !chip || !panel || !enableToggle || !prevBtn || !playPauseBtn || !nextBtn
    || !playerTitleEl || !playerSubtitleEl || !progressSectionEl || !progressTrackEl
    || !progressFillEl || !timeElapsedEl || !timeDurationEl
    || !tracksRoot || !sourceDefault || !sourceSpotify
    || !spotifyConnectBtn || !spotifyHint || !ambientRoot
  ) {
    return;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function updateProgressUI() {
    if (state.source !== 'default') return;
    const cur = trackAudio.currentTime || 0;
    const dur = trackAudio.duration;
    const pct = Number.isFinite(dur) && dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
    progressFillEl.style.width = `${pct}%`;
    timeElapsedEl.textContent = formatTime(cur);
    timeDurationEl.textContent = Number.isFinite(dur) && dur > 0 ? formatTime(dur) : '--:--';
    progressTrackEl.setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  // Primary music track audio instance (default source).
  const trackAudio = new Audio();
  trackAudio.loop = false;
  trackAudio.volume = 0.6;

  // Separate ambient layer so nature sounds can run independently from tracks.
  const ambientAudio = new Audio();
  ambientAudio.loop = true;
  ambientAudio.volume = 0.45;

  // Central state for mini-player UI, source selection, and playback behavior.
  const state = {
    enabled: true,
    source: 'default',       // 'default' | 'spotify'
    currentTrackIndex: 0,
    isPlaying: false,
    ambientMode: 'forest',
    spotifyConnected: false,
    panelOpen: false,
  };

  // Spotify Web Playback SDK references (populated after successful connect).
  let spotifyPlayer = null;   // Spotify.Player instance
  let spotifyDeviceId = null;  // Device ID assigned by Spotify after SDK ready
  let spotifyToken = null;     // Current Spotify access token

  /** Prevents renderSpotifyPlaylists() from re-fetching on every render(); reset on disconnect / OAuth. */
  let _playlistsRendered = false;

  // Day/night detection used by forest ambience to pick correct variant.
  function isNightNow() {
    const scene = document.getElementById('scene');
    const body = document.body;

    const hasNightClass =
      body.classList.contains('is-night') ||
      body.classList.contains('night') ||
      (scene && (scene.classList.contains('is-night') || scene.classList.contains('night')));
    if (hasNightClass) return true;

    const h = new Date().getHours();
    return h >= 19 || h < 6;
  }

  function saveState() {
    const persistable = {
      enabled: state.enabled,
      source: state.source,
      currentTrackIndex: state.currentTrackIndex,
      isPlaying: state.isPlaying,
      ambientMode: state.ambientMode,
      spotifyConnected: state.spotifyConnected,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.enabled = parsed.enabled !== false;
      state.source = parsed.source === 'spotify' ? 'spotify' : 'default';
      state.currentTrackIndex = Number.isInteger(parsed.currentTrackIndex) ? parsed.currentTrackIndex : 0;
      state.currentTrackIndex = Math.max(0, Math.min(state.currentTrackIndex, Math.max(0, BUDDYDORO_TRACKS.length - 1)));
      state.isPlaying = Boolean(parsed.isPlaying);
      state.ambientMode = AMBIENT_AUDIO[parsed.ambientMode] ? parsed.ambientMode : 'forest';
      state.spotifyConnected = Boolean(parsed.spotifyConnected);
    } catch {
      // Ignore corrupt saved data and fall back to defaults.
    }
  }

  function getCurrentTrack() {
    if (!BUDDYDORO_TRACKS.length) return null;
    return BUDDYDORO_TRACKS[state.currentTrackIndex] || BUDDYDORO_TRACKS[0];
  }

  function setTrack(index) {
    if (!BUDDYDORO_TRACKS.length) return;
    state.currentTrackIndex = (index + BUDDYDORO_TRACKS.length) % BUDDYDORO_TRACKS.length;
    const track = getCurrentTrack();
    if (!track) return;
    trackAudio.src = track.src;
  }

  // Browser-safe play wrapper (avoids uncaught autoplay errors).
  async function safePlay(audio) {
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  function pauseAllAudio() {
    trackAudio.pause();
    ambientAudio.pause();
    state.isPlaying = false;
  }

  function pauseTrackAudio() {
    trackAudio.pause();
    state.isPlaying = false;
  }

  // Sync ambient loop to current mode + day/night variant.
  // Ambient sounds are app-level environment audio and should play continuously.
  async function syncAmbientPlayback() {
    const mode = state.ambientMode;
    const config = AMBIENT_AUDIO[mode];
    if (!config) return;

    const src = isNightNow() ? (config.night || config.day) : config.day;
    if (ambientAudio.src !== new URL(src, window.location.href).href) {
      ambientAudio.src = src;
    }

    await safePlay(ambientAudio);
  }

  // Start or resume currently selected default track.
  async function playCurrentDefaultTrack() {
    const track = getCurrentTrack();
    if (!track) {
      showNotification('No default tracks configured yet.', 'error');
      return;
    }
    if (!trackAudio.src) setTrack(state.currentTrackIndex);

    if (!state.enabled) return;
    const ok = await safePlay(trackAudio);
    state.isPlaying = ok;
    if (!ok) showNotification('Unable to start playback. Interact with the page and try again.', 'error');
  }

  function stopCurrentTrack() {
    trackAudio.pause();
    trackAudio.currentTime = 0;
    state.isPlaying = false;
  }

  // Source switching: pause default tracks when switching to Spotify and vice-versa.
  async function applySourceBehavior() {
    if (state.source === 'spotify') {
      stopCurrentTrack();
      // If Spotify is connected, make sure the SDK player is initialized.
      if (state.spotifyConnected && !spotifyPlayer) {
        await bootSpotifyPlayer();
      }
    } else {
      // Switching back to default — pause Spotify playback if active.
      if (spotifyPlayer) {
        try { await spotifyPlayer.pause(); } catch { /* ignore */ }
      }
      if (state.enabled && state.isPlaying) {
        await playCurrentDefaultTrack();
      }
    }
  }

  /* ----------------------------------------------------------------
   * Spotify Web Playback SDK Integration
   *
   * The SDK lets BuddyDoro act as a Spotify Connect device so music
   * streams directly inside the browser tab. Requires Premium.
   * ---------------------------------------------------------------- */

  /**
   * Fetches a fresh Spotify access token from our backend.
   * The backend auto-refreshes expired tokens using the stored refresh token.
   */
  async function fetchSpotifyToken() {
    const authToken = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE}/spotify/token`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to get Spotify token');
    }
    const data = await res.json();
    spotifyToken = data.accessToken;
    return spotifyToken;
  }

  /**
   * Initializes the Spotify Web Playback SDK player instance.
   * Listens for ready, state-change, and error events to keep
   * our UI in sync with Spotify's playback state.
   */
  async function bootSpotifyPlayer() {
    if (spotifyPlayer) return; // already initialized

    try {
      spotifyToken = await fetchSpotifyToken();
    } catch (err) {
      showNotification(err.message, 'error');
      state.spotifyConnected = false;
      render();
      saveState();
      return;
    }

    // The SDK exposes window.Spotify after the <script> loads.
    if (typeof window.Spotify === 'undefined') {
      showNotification('Spotify SDK not loaded. Please refresh the page.', 'error');
      return;
    }

    spotifyPlayer = new window.Spotify.Player({
      name: 'BuddyDoro',
      // The SDK calls this whenever it needs a token (including refresh).
      getOAuthToken: async (cb) => {
        try {
          const token = await fetchSpotifyToken();
          cb(token);
        } catch {
          cb('');
        }
      },
      volume: 0.6,
    });

    // Fires when the SDK has a device ready for playback.
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      spotifyDeviceId = device_id;
      showNotification('Spotify connected! Select a playlist or press Play.', 'success');
      render();
    });

    spotifyPlayer.addListener('not_ready', () => {
      spotifyDeviceId = null;
    });

    // Keep our status line updated with whatever Spotify is playing.
    spotifyPlayer.addListener('player_state_changed', (playerState) => {
      if (!playerState) return;
      state.isPlaying = !playerState.paused;
      render();
    });

    // Premium-only guard: the SDK emits this for free-tier accounts.
    spotifyPlayer.addListener('authentication_error', () => {
      showNotification('Spotify Premium is required for in-app playback.', 'error');
      cleanupSpotifyPlayer();
    });

    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      showNotification(`Spotify init error: ${message}`, 'error');
      cleanupSpotifyPlayer();
    });

    const connected = await spotifyPlayer.connect();
    if (!connected) {
      showNotification('Could not connect to Spotify. Try again.', 'error');
      cleanupSpotifyPlayer();
    }
  }

  /** Tear down the SDK player and reset Spotify-specific state. */
  function cleanupSpotifyPlayer() {
    if (spotifyPlayer) {
      spotifyPlayer.disconnect();
      spotifyPlayer = null;
    }
    spotifyDeviceId = null;
    spotifyToken = null;
    _playlistsRendered = false;
    state.spotifyConnected = false;
    render();
    saveState();
  }

  /**
   * Transfers playback to BuddyDoro's SDK device so audio plays here
   * instead of another Spotify Connect device the user might have open.
   */
  async function transferPlaybackHere() {
    if (!spotifyDeviceId || !spotifyToken) return;
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false }),
    });
  }

  /**
   * Fetches the user's Spotify playlists and renders them in the
   * track-list area when source is set to Spotify.
   * Uses _playlistsRendered to avoid re-fetching on every render() cycle.
   */
  async function renderSpotifyPlaylists() {
    if (_playlistsRendered) return;
    _playlistsRendered = true;
    tracksRoot.className = 'music-playlist-browse';
    tracksRoot.innerHTML = '<div class="music-empty">Loading playlists…</div>';
    try {
      const token = await fetchSpotifyToken();
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load playlists');
      const data = await res.json();

      tracksRoot.innerHTML = '';
      if (!data.items?.length) {
        tracksRoot.innerHTML = '<div class="music-empty">No playlists found.</div>';
        return;
      }

      data.items.forEach((pl) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'music-playlist-row';
        row.textContent = pl.name;
        row.addEventListener('click', () => playSpotifyContext(pl.uri));
        tracksRoot.appendChild(row);
      });
    } catch (err) {
      tracksRoot.innerHTML = `<div class="music-empty">${err.message}</div>`;
    }
  }

  /**
   * Starts playback of a Spotify context (playlist/album URI) on the
   * BuddyDoro SDK device.
   */
  async function playSpotifyContext(contextUri) {
    if (!spotifyDeviceId) {
      showNotification('Spotify device not ready. Try again.', 'error');
      return;
    }
    try {
      const token = await fetchSpotifyToken();
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_uri: contextUri }),
      });
      state.isPlaying = true;
      render();
      saveState();
    } catch {
      showNotification('Could not start Spotify playback.', 'error');
    }
  }

  /** Disconnects Spotify on both frontend and backend. */
  async function disconnectSpotify() {
    const authToken = localStorage.getItem('authToken');
    try {
      await fetch(`${API_BASE}/spotify/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch { /* best-effort */ }
    cleanupSpotifyPlayer();
    showNotification('Spotify disconnected.', 'success');
  }

  // Compact track picker (horizontal) — main “now playing” is the player card above.
  function renderTrackList() {
    tracksRoot.className = 'music-track-strip';
    tracksRoot.innerHTML = '';
    if (!BUDDYDORO_TRACKS.length) {
      tracksRoot.innerHTML = '<div class="music-empty">No default tracks yet.</div>';
      return;
    }

    const stripLabel = document.createElement('div');
    stripLabel.className = 'music-track-strip-label';
    stripLabel.textContent = 'Playlist';
    tracksRoot.appendChild(stripLabel);

    const row = document.createElement('div');
    row.className = 'music-track-strip-tracks';
    BUDDYDORO_TRACKS.forEach((track, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `music-track-pill${idx === state.currentTrackIndex ? ' is-active' : ''}`;
      pill.textContent = track.title;
      pill.title = track.title;
      pill.addEventListener('click', async () => {
        state.currentTrackIndex = idx;
        setTrack(idx);
        state.isPlaying = true;
        if (state.source === 'default') {
          await playCurrentDefaultTrack();
        }
        render();
        saveState();
      });
      row.appendChild(pill);
    });
    tracksRoot.appendChild(row);
  }

  // Renders ambient mode controls (forest, river, rain, cricket).
  function renderAmbientOptions() {
    ambientRoot.innerHTML = '';
    AMBIENT_MODES.forEach((mode) => {
      const id = `ambient-${mode.id}`;
      const item = document.createElement('label');
      item.className = `music-ambient-option${state.ambientMode === mode.id ? ' is-active' : ''}`;
      item.setAttribute('for', id);
      item.innerHTML = `
        <input id="${id}" type="radio" name="ambient-mode" value="${mode.id}" ${state.ambientMode === mode.id ? 'checked' : ''} />
        <span class="ambient-icon">${mode.icon}</span>
        <span class="ambient-label">${mode.label}</span>
      `;
      const input = item.querySelector('input');
      input?.addEventListener('change', async () => {
        state.ambientMode = mode.id;
        await syncAmbientPlayback();
        render();
        saveState();
      });
      ambientRoot.appendChild(item);
    });
  }

  // Single render pass keeps UI controls in sync with state.
  function render() {
    chip.setAttribute('aria-expanded', state.panelOpen ? 'true' : 'false');
    panel.hidden = !state.panelOpen;

    enableToggle.checked = state.enabled;
    if (enableToggleText) enableToggleText.textContent = state.enabled ? 'On' : 'Off';
    sourceDefault.checked = state.source === 'default';
    sourceSpotify.checked = state.source === 'spotify';

    const defaultActive = state.source === 'default';
    const spotifyReady = state.spotifyConnected && spotifyDeviceId;

    // MP3-style “now playing” title + subtitle
    if (state.source === 'spotify') {
      playerTitleEl.textContent = 'Spotify';
      if (spotifyReady) {
        playerSubtitleEl.textContent = state.isPlaying ? 'Playing' : 'Ready — pick a playlist below';
      } else if (state.spotifyConnected) {
        playerSubtitleEl.textContent = 'Connecting…';
      } else {
        playerSubtitleEl.textContent = 'Not connected';
      }
    } else {
      const currentTrack = getCurrentTrack();
      if (!currentTrack) {
        playerTitleEl.textContent = 'No tracks';
        playerSubtitleEl.textContent = 'Add audio in music catalog';
      } else {
        playerTitleEl.textContent = currentTrack.title;
        const stateLabel = !state.enabled ? 'Music off' : state.isPlaying ? 'Playing' : 'Paused';
        playerSubtitleEl.textContent = `BuddyDoro · ${stateLabel}`;
      }
    }

    progressSectionEl.hidden = state.source !== 'default';
    if (state.source === 'default') {
      updateProgressUI();
    }

    if (playerCardEl) {
      playerCardEl.dataset.playing = state.isPlaying ? 'true' : 'false';
    }

    // Transport controls: enabled for default tracks OR a connected Spotify device.
    if (defaultActive) {
      prevBtn.disabled = !state.enabled || !BUDDYDORO_TRACKS.length;
      playPauseBtn.disabled = !BUDDYDORO_TRACKS.length;
      nextBtn.disabled = !state.enabled || !BUDDYDORO_TRACKS.length;
    } else {
      prevBtn.disabled = !spotifyReady;
      playPauseBtn.disabled = !spotifyReady;
      nextBtn.disabled = !spotifyReady;
    }
    playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';

    // Show default track list or Spotify playlists depending on source.
    tracksRoot.hidden = false;
    spotifyHint.hidden = defaultActive || state.spotifyConnected;

    // Connect/Disconnect button text and visibility.
    if (defaultActive) {
      spotifyConnectBtn.hidden = true;
    } else {
      spotifyConnectBtn.hidden = false;
      spotifyConnectBtn.textContent = state.spotifyConnected ? 'Disconnect Spotify' : 'Connect Spotify';
    }

    if (defaultActive) {
      renderTrackList();
    } else if (state.spotifyConnected) {
      renderSpotifyPlaylists();
    } else {
      tracksRoot.className = 'music-playlist-browse';
      tracksRoot.innerHTML = '<div class="music-empty">Connect Spotify to see your playlists.</div>';
    }
    renderAmbientOptions();
  }

  // Toggle mini-player panel from floating music button.
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    state.panelOpen = !state.panelOpen;
    render();
  });

  // Close panel when clicking outside (use closest() so clicks on chip children still count as chip).
  document.addEventListener('pointerdown', (event) => {
    if (!state.panelOpen) return;
    const t = event.target;
    if (t.closest?.('#musicChip') || t.closest?.('#musicMiniPanel')) return;
    state.panelOpen = false;
    render();
  }, true);

  // Accessibility: close panel on Escape.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.panelOpen) {
      state.panelOpen = false;
      render();
      chip.focus();
    }
  });

  // Master toggle controls only track music.
  // Ambient/environment sounds remain active at all times.
  enableToggle.addEventListener('change', async () => {
    state.enabled = enableToggle.checked;
    if (!state.enabled) {
      pauseTrackAudio();
    } else {
      if (state.source === 'default' && state.isPlaying) {
        await playCurrentDefaultTrack();
      }
    }
    render();
    saveState();
  });

  // Source selector: Default music (active in Phase 1).
  sourceDefault.addEventListener('change', async () => {
    if (!sourceDefault.checked) return;
    state.source = 'default';
    _playlistsRendered = false;
    await applySourceBehavior();
    render();
    saveState();
  });

  // Source selector: Spotify — switches audio source and boots SDK if connected.
  sourceSpotify.addEventListener('change', async () => {
    if (!sourceSpotify.checked) return;
    _playlistsRendered = false;
    state.source = 'spotify';
    await applySourceBehavior();
    render();
    saveState();
  });

  // Connect / Disconnect Spotify depending on current state.
  spotifyConnectBtn.addEventListener('click', async () => {
    if (state.spotifyConnected) {
      // Already connected — user wants to disconnect.
      await disconnectSpotify();
    } else {
      // Redirect to our backend which kicks off the Spotify OAuth flow.
      const token = localStorage.getItem('authToken');
      window.location.href = `${API_BASE}/spotify/login?token=${encodeURIComponent(token)}`;
    }
  });

  // Transport: Previous track (default tracks or Spotify).
  prevBtn.addEventListener('click', async () => {
    if (state.source === 'spotify' && spotifyPlayer) {
      await spotifyPlayer.previousTrack();
    } else {
      setTrack(state.currentTrackIndex - 1);
      state.isPlaying = true;
      await playCurrentDefaultTrack();
    }
    render();
    saveState();
  });

  // Transport: Next track (default tracks or Spotify).
  nextBtn.addEventListener('click', async () => {
    if (state.source === 'spotify' && spotifyPlayer) {
      await spotifyPlayer.nextTrack();
    } else {
      setTrack(state.currentTrackIndex + 1);
      state.isPlaying = true;
      await playCurrentDefaultTrack();
    }
    render();
    saveState();
  });

  // Transport: Play/Pause — routes to Spotify SDK or default audio engine.
  playPauseBtn.addEventListener('click', async () => {
    if (state.source === 'spotify' && spotifyPlayer) {
      await spotifyPlayer.togglePlay();
      render();
      saveState();
      return;
    }
    if (state.source !== 'default') return;
    if (!state.isPlaying) {
      if (!state.enabled) {
        state.enabled = true;
        enableToggle.checked = true;
      }
      state.isPlaying = true;
      await playCurrentDefaultTrack();
      await syncAmbientPlayback();
    } else {
      trackAudio.pause();
      state.isPlaying = false;
    }
    render();
    saveState();
  });

  // Auto-advance to next default track when current track ends.
  trackAudio.addEventListener('ended', async () => {
    setTrack(state.currentTrackIndex + 1);
    if (state.source === 'default' && state.enabled && state.isPlaying) {
      await playCurrentDefaultTrack();
      render();
      saveState();
    }
  });

  trackAudio.addEventListener('timeupdate', () => {
    if (state.source === 'default') updateProgressUI();
  });
  trackAudio.addEventListener('loadedmetadata', updateProgressUI);
  trackAudio.addEventListener('durationchange', updateProgressUI);

  progressTrackEl.addEventListener('click', (e) => {
    if (state.source !== 'default' || !Number.isFinite(trackAudio.duration) || trackAudio.duration <= 0) return;
    const rect = progressTrackEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    trackAudio.currentTime = ratio * trackAudio.duration;
    updateProgressUI();
  });

  // --- Initialization ---

  // Restore persisted music UI (source, spotifyConnected, etc.) before reading OAuth query params,
  // otherwise loadState() would overwrite a fresh ?spotifyConnected=true redirect from the backend.
  loadState();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('spotifyConnected') === 'true') {
    state.spotifyConnected = true;
    state.source = 'spotify';
    _playlistsRendered = false;
    showNotification('Spotify account connected!', 'success');
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (urlParams.get('spotifyError')) {
    showNotification(`Spotify error: ${urlParams.get('spotifyError')}`, 'error');
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Default / BuddyDoro tracks: never auto-play on page load — they start with the focus timer (see below).
  // Nature ambience: start as soon as possible after login (may require a user gesture per browser autoplay policy).
  state.isPlaying = false;
  trackAudio.pause();

  setTrack(state.currentTrackIndex);
  syncAmbientPlayback();
  render();
  saveState();

  function bindTimerMusic() {
    if (!timer?.onStart) return;

    const pauseDefaultFocusMusic = () => {
      if (state.source !== 'default') return;
      pauseTrackAudio();
      render();
      saveState();
    };

    timer.onStart(({ mode }) => {
      if (mode !== 'focus' || state.source !== 'default' || !state.enabled) return;
      state.isPlaying = true;
      playCurrentDefaultTrack().then(() => {
        render();
        saveState();
      });
    });

    timer.onPause(pauseDefaultFocusMusic);
    timer.onStop(pauseDefaultFocusMusic);
    timer.onComplete(pauseDefaultFocusMusic);
  }

  bindTimerMusic();

  /**
   * Spotify Web Playback SDK global callback (see index.html stub before sdk.scdn.co script).
   * index.html sets a no-op so the SDK never throws AnthemError on load.
   * Here we replace it with bootSpotifyPlayer when the user has an active Spotify link.
   * If the CDN script finished before this module ran, window.Spotify already exists — boot immediately.
   */
  if (state.spotifyConnected) {
    window.onSpotifyWebPlaybackSDKReady = () => bootSpotifyPlayer();
    if (typeof window.Spotify !== 'undefined') bootSpotifyPlayer();
  }

  // Retry ambient playback after first user interaction if autoplay was blocked.
  const resumeAmbient = () => syncAmbientPlayback();
  window.addEventListener('pointerdown', resumeAmbient, { once: true });
  window.addEventListener('keydown', resumeAmbient, { once: true });

  // Extra attempts so nature sounds start as early as possible after load / bfcache restore.
  window.addEventListener('load', () => { syncAmbientPlayback(); });
  window.addEventListener('pageshow', () => { syncAmbientPlayback(); });

  // Keep forest ambience synced when day/night context changes over time.
  setInterval(() => {
    if (state.ambientMode === 'forest') {
      syncAmbientPlayback();
    }
  }, 60 * 1000);

  return {
    stop() {
      // Stop track playback while keeping ambient environment active.
      pauseTrackAudio();
      if (spotifyPlayer) {
        spotifyPlayer.pause().catch(() => {});
      }
      render();
      saveState();
    },
  };
}