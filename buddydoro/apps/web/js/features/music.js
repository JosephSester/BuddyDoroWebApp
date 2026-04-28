import {
  AMBIENT_AUDIO,
  AMBIENT_MODES,
  BUDDYDORO_TRACKS,
  RAIN_SCENE_AUDIO,
} from './musicCatalog.js';
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
  const trackListLabelEl = document.getElementById('musicTrackListLabel');
  const ambientSectionEl = document.getElementById('musicAmbientSection');
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
  const ambientRoot = document.getElementById('musicAmbientList');
  const volumeSettingsBtn = document.getElementById('musicVolumeSettingsBtn');
  const volumePanel = document.getElementById('musicVolumePanel');
  const volumePanelClose = document.getElementById('musicVolumePanelClose');
  const musicVolSlider = document.getElementById('musicVolumeSlider');
  const ambientVolSlider = document.getElementById('musicAmbientVolumeSlider');
  const musicVolValueEl = document.getElementById('musicVolumeValue');
  const ambientVolValueEl = document.getElementById('musicAmbientVolumeValue');

  if (
    !chip || !panel || !enableToggle || !prevBtn || !playPauseBtn || !nextBtn
    || !playerTitleEl || !playerSubtitleEl || !progressSectionEl || !progressTrackEl
    || !progressFillEl || !timeElapsedEl || !timeDurationEl
    || !tracksRoot || !sourceDefault || !sourceSpotify || !ambientRoot
    || !volumeSettingsBtn || !volumePanel || !volumePanelClose
    || !musicVolSlider || !ambientVolSlider || !musicVolValueEl || !ambientVolValueEl
  ) {
    return;
  }

  let volumePanelOpen = false;

  function clamp01(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(1, x));
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

  // Nature ambience (Forest / River / Cricket) — one at a time, independent from focus tracks.
  const ambientAudio = new Audio();
  ambientAudio.loop = true;

  // Extra rain SFX when the scene overlay is active and the user did not pick Rain ambient (avoids doubling).
  const rainAudio = new Audio();
  rainAudio.loop = true;

  /** Relative loudness of scene rain vs nature ambient at the same “Ambient” slider level (legacy mix). */
  const SCENE_RAIN_GAIN = 0.32 / 0.45;

  /** Driven by rain.js (CustomEvent); not persisted. */
  let sceneRainActive = false;

  // Unified playlist: tracks first, then ambient modes.
  const UNIFIED_PLAYLIST = [
    ...BUDDYDORO_TRACKS.map((t, i) => ({ type: 'track', index: i })),
    ...AMBIENT_MODES.map(m => ({ type: 'ambient', id: m.id })),
  ];

  // Central state for mini-player UI, source selection, and playback behavior.
  const state = {
    enabled: true,
    source: 'default',       // 'default' | 'spotify'
    currentTrackIndex: 0,
    unifiedIndex: 0,         // focus track index in UNIFIED_PLAYLIST (ambient is separate; never an ambient slot for UI)
    isPlaying: false,
    ambientMode: null,
    spotifyConnected: false,
    panelOpen: false,
    /** 0–1: BuddyDoro focus tracks + Spotify Web Playback */
    musicVolume: 0.6,
    /** 0–1: nature ambient + (scaled) scene rain layer */
    ambientVolume: 0.45,
  };

  function applyAudioVolumes() {
    state.musicVolume = clamp01(state.musicVolume);
    state.ambientVolume = clamp01(state.ambientVolume);
    trackAudio.volume = state.musicVolume;
    ambientAudio.volume = state.ambientVolume;
    rainAudio.volume = Math.min(1, state.ambientVolume * SCENE_RAIN_GAIN);
    if (spotifyPlayer && typeof spotifyPlayer.setVolume === 'function') {
      spotifyPlayer.setVolume(state.musicVolume).catch(() => {});
    }
  }

  // Spotify Web Playback SDK references (populated after successful connect).
  let spotifyPlayer = null;   // Spotify.Player instance
  let spotifyDeviceId = null;  // Device ID assigned by Spotify after SDK ready
  let spotifyToken = null;     // Current Spotify access token

  /** Prevents renderSpotifyPlaylists() from re-fetching on every render(); reset on disconnect / OAuth. */
  let _playlistsRendered = false;

  function saveState() {
    const persistable = {
      enabled: state.enabled,
      source: state.source,
      currentTrackIndex: state.currentTrackIndex,
      unifiedIndex: state.unifiedIndex,
      isPlaying: state.isPlaying,
      ambientMode: state.ambientMode,
      spotifyConnected: state.spotifyConnected,
      musicVolume: state.musicVolume,
      ambientVolume: state.ambientVolume,
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
      state.ambientMode = AMBIENT_AUDIO[parsed.ambientMode] ? parsed.ambientMode : null;
      state.spotifyConnected = Boolean(parsed.spotifyConnected);
      if (Number.isFinite(parsed.musicVolume)) state.musicVolume = clamp01(parsed.musicVolume);
      if (Number.isFinite(parsed.ambientVolume)) state.ambientVolume = clamp01(parsed.ambientVolume);
      // unifiedIndex always tracks the focus track slot (ambient never owns the now-playing row).
      if (Number.isInteger(parsed.unifiedIndex) && parsed.unifiedIndex >= 0 && parsed.unifiedIndex < UNIFIED_PLAYLIST.length) {
        state.unifiedIndex = parsed.unifiedIndex;
      } else {
        state.unifiedIndex = state.currentTrackIndex;
      }
      if (UNIFIED_PLAYLIST[state.unifiedIndex]?.type === 'ambient') {
        state.unifiedIndex = state.currentTrackIndex;
      }
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
    rainAudio.pause();
    state.isPlaying = false;
    if (spotifyPlayer) {
      spotifyPlayer.pause().catch(() => {});
    }
  }

  function pauseTrackAudio() {
    trackAudio.pause();
    state.isPlaying = false;
  }

  // Sync user-selected ambient (same asset day or night — never overridden by time or background).
  async function syncAmbientPlayback() {
    const mode = state.ambientMode;
    const config = AMBIENT_AUDIO[mode];
    if (!config) {
      ambientAudio.pause();
      return;
    }

    const src = config.day || config.night;
    if (ambientAudio.src !== new URL(src, window.location.href).href) {
      ambientAudio.src = src;
    }

    if (!state.enabled) {
      ambientAudio.pause();
      return;
    }

    await safePlay(ambientAudio);
  }

  /** Extra rain layer when the canvas rain overlay runs; skipped if user already chose Rain ambient (one stream). */
  async function syncRainFromScene() {
    const src = RAIN_SCENE_AUDIO.src;
    const href = new URL(src, window.location.href).href;
    if (rainAudio.src !== href) rainAudio.src = src;

    if (
      !state.enabled
      || state.source !== 'default'
      || !sceneRainActive
      || state.ambientMode === 'rain'
    ) {
      rainAudio.pause();
      return;
    }

    await safePlay(rainAudio);
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
      ambientAudio.pause();
      rainAudio.pause();
      // If Spotify is connected, make sure the SDK player is initialized.
      if (state.spotifyConnected && !spotifyPlayer) {
        await bootSpotifyPlayer();
      }
    } else {
      // Switching back to default — pause Spotify playback if active.
      if (spotifyPlayer) {
        try { await spotifyPlayer.pause(); } catch { /* ignore */ }
      }
      if (state.ambientMode) await syncAmbientPlayback();
      await syncRainFromScene();
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
    if (!authToken) {
      throw new Error('BuddyDoro session missing — log in again, then connect Spotify.');
    }
    const res = await fetch(`${API_BASE}/spotify/token`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to get Spotify token');
    }
    const data = await res.json();
    if (!data.accessToken || typeof data.accessToken !== 'string') {
      throw new Error('Server did not return a Spotify access token. Try Disconnect, then Connect Spotify again.');
    }
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
      // Never call cb('') without handling it: Spotify then returns 401 "No token provided" on their APIs.
      getOAuthToken: async (cb) => {
        try {
          const token = await fetchSpotifyToken();
          cb(token);
        } catch (err) {
          console.error('[music] Spotify getOAuthToken failed:', err);
          showNotification(err.message || 'Spotify token failed — log in or reconnect Spotify.', 'error');
          cleanupSpotifyPlayer();
          cb('');
        }
      },
      volume: state.musicVolume,
    });

    // Fires when the SDK has registered this tab as a Spotify Connect device (device_id is stable for this session).
    // We then tell Spotify's API to switch the "active" Connect device to this tab so playback targets the browser.
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      spotifyDeviceId = device_id;
      void (async () => {
        await transferPlaybackHere();
        applyAudioVolumes();
        showNotification('Spotify connected! Select a playlist or press Play.', 'success');
        render();
      })();
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
      cleanupSpotifyPlayer({ preserveAccountLink: true });
    });

    const connected = await spotifyPlayer.connect();
    if (!connected) {
      showNotification('Could not connect to Spotify. Try again.', 'error');
      cleanupSpotifyPlayer({ preserveAccountLink: true });
    } else {
      applyAudioVolumes();
    }
  }

  /**
   * Ask Spotify to make the Web Playback SDK device (this browser tab) the active
   * Connect target, without starting playback yet (play: false).
   *
   * Flow:
   * 1. User may already be playing on phone/TV/etc. Spotify still considers that the "active device".
   * 2. Our PUT /player/play calls include device_id, but transferring first avoids edge cases where
   *    audio stays on the other device or the first command targets the wrong player.
   * 3. Browser → Buddy API (Bearer JWT) → Spotify Web API with the user's stored tokens (server-side).
   *
   * Requires spotifyDeviceId (from SDK `ready`) and spotifyToken (from initial fetchSpotifyToken in boot).
   * Failures are ignored at call sites (best-effort); playlist play can still succeed.
   */
  async function transferPlaybackHere() {
    if (!spotifyDeviceId || !spotifyToken) return;
    const authToken = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE}/spotify/player`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [spotifyDeviceId], play: false }),
      });
      if (!res.ok && res.status !== 204) {
        // Non-fatal: user can still try Play; optional follow-up in playSpotifyContext.
        console.warn('[music] transferPlaybackHere:', res.status);
      }
    } catch (e) {
      console.warn('[music] transferPlaybackHere failed:', e);
    }
  }

  /**
   * Tear down the Web Playback SDK instance.
   * @param {{ preserveAccountLink?: boolean }} [opts] — If true, keep `state.spotifyConnected` so
   *   playlist API calls still work after a failed SDK connect (tokens remain on the server).
   */
  function cleanupSpotifyPlayer(opts = {}) {
    const preserveAccountLink = Boolean(opts.preserveAccountLink);
    if (spotifyPlayer) {
      spotifyPlayer.disconnect();
      spotifyPlayer = null;
    }
    spotifyDeviceId = null;
    spotifyToken = null;
    _playlistsRendered = false;
    if (!preserveAccountLink) {
      state.spotifyConnected = false;
    }
    render();
    saveState();
  }

  /**
   * Fetches the user's Spotify playlists and renders them in the
   * track-list area when source is set to Spotify.
   * Uses _playlistsRendered to avoid re-fetching on every render() cycle.
   */
  async function renderSpotifyPlaylists() {
    if (_playlistsRendered) return;
    _playlistsRendered = true;
    tracksRoot.className = 'music-track-list music-playlist-browse';
    tracksRoot.innerHTML = '<div class="music-empty">Loading playlists…</div>';
    try {
      const authToken = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/spotify/me/playlists?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.message || errBody.detail || `Failed to load playlists (${res.status})`,
        );
      }
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

      const disconnectBtn = document.createElement('button');
      disconnectBtn.type = 'button';
      disconnectBtn.className = 'music-spotify-btn music-spotify-btn--disconnect';
      disconnectBtn.textContent = 'Disconnect Spotify';
      disconnectBtn.addEventListener('click', () => disconnectSpotify());
      tracksRoot.appendChild(disconnectBtn);
    } catch (err) {
      _playlistsRendered = false;
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
      // Re-affirm this tab as the active device right before starting a context (e.g. user resumed on phone since ready).
      await transferPlaybackHere();

      const authToken = localStorage.getItem('authToken');
      const playRes = await fetch(`${API_BASE}/spotify/player/play?device_id=${encodeURIComponent(spotifyDeviceId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_uri: contextUri }),
      });
      if (!playRes.ok) {
        const err = await playRes.json().catch(() => ({}));
        showNotification(err.detail || err.message || 'Could not start Spotify playback.', 'error');
        return;
      }
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
    tracksRoot.className = 'music-track-list music-track-strip';
    tracksRoot.innerHTML = '';
    if (!BUDDYDORO_TRACKS.length) {
      tracksRoot.innerHTML = '<div class="music-empty">No default tracks yet.</div>';
      return;
    }

    const row = document.createElement('div');
    row.className = 'music-track-strip-tracks';
    BUDDYDORO_TRACKS.forEach((track, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `music-track-pill${idx === state.currentTrackIndex ? ' is-active' : ''}`;
      pill.textContent = track.title;
      pill.title = track.title;
      pill.addEventListener('click', () => {
        state.currentTrackIndex = idx;
        state.unifiedIndex = idx;
        setTrack(idx);
        if (state.isPlaying) void playCurrentDefaultTrack();
        render();
        saveState();
      });
      row.appendChild(pill);
    });
    tracksRoot.appendChild(row);
  }

  // Renders ambient mode controls as pills (explicit None = no ambient layer).
  function renderAmbientOptions() {
    ambientRoot.innerHTML = '';
    ambientRoot.className = 'music-ambient-list music-track-strip-tracks';

    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = `music-track-pill music-track-pill--none${state.ambientMode === null ? ' is-active' : ''}`;
    noneBtn.textContent = 'None';
    noneBtn.title = 'No ambient background';
    noneBtn.setAttribute('aria-pressed', state.ambientMode === null ? 'true' : 'false');
    noneBtn.addEventListener('click', () => {
      ambientAudio.pause();
      state.ambientMode = null;
      state.unifiedIndex = state.currentTrackIndex;
      void syncRainFromScene();
      render();
      saveState();
    });
    ambientRoot.appendChild(noneBtn);

    AMBIENT_MODES.forEach((mode) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `music-track-pill${state.ambientMode === mode.id ? ' is-active' : ''}`;
      btn.textContent = mode.label;
      btn.title = mode.label;
      btn.setAttribute('aria-pressed', state.ambientMode === mode.id ? 'true' : 'false');
      btn.addEventListener('click', async () => {
        state.ambientMode = mode.id;
        state.unifiedIndex = state.currentTrackIndex;
        if (!state.enabled) {
          state.enabled = true;
          enableToggle.checked = true;
        }
        await syncAmbientPlayback();
        await syncRainFromScene();
        render();
        saveState();
      });
      ambientRoot.appendChild(btn);
    });
  }

  // Single render pass keeps UI controls in sync with state.
  function render() {
    chip.setAttribute('aria-expanded', state.panelOpen ? 'true' : 'false');
    chip.setAttribute('aria-label', state.panelOpen ? 'Close music panel' : 'Open music panel');
    panel.hidden = !state.panelOpen;

    volumePanel.hidden = !volumePanelOpen;
    volumeSettingsBtn.setAttribute('aria-expanded', volumePanelOpen ? 'true' : 'false');
    const musicPct = Math.round(state.musicVolume * 100);
    const ambientPct = Math.round(state.ambientVolume * 100);
    musicVolSlider.value = String(musicPct);
    ambientVolSlider.value = String(ambientPct);
    musicVolValueEl.textContent = `${musicPct}%`;
    ambientVolValueEl.textContent = `${ambientPct}%`;
    musicVolSlider.setAttribute('aria-valuenow', String(musicPct));
    ambientVolSlider.setAttribute('aria-valuenow', String(ambientPct));

    enableToggle.checked = state.enabled;
    if (enableToggleText) enableToggleText.textContent = state.enabled ? 'On' : 'Off';
    sourceDefault.checked = state.source === 'default';
    sourceSpotify.checked = state.source === 'spotify';

    const defaultActive = state.source === 'default';
    const spotifyReady = state.spotifyConnected && spotifyDeviceId;
    const natureLive = defaultActive && Boolean(state.ambientMode && state.enabled && !ambientAudio.paused);
    const rainLive = defaultActive && Boolean(
      sceneRainActive && state.ambientMode !== 'rain' && state.enabled && !rainAudio.paused,
    );
    const ambientLive = natureLive || rainLive;
    const ambientHintParts = [];
    if (defaultActive && state.ambientMode) ambientHintParts.push('Ambient (None to stop)');
    if (defaultActive && sceneRainActive && state.ambientMode !== 'rain') {
      ambientHintParts.push('Scene rain layered on');
    }
    const ambientHint = ambientHintParts.length ? ` · ${ambientHintParts.join(' · ')}` : '';

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
      if (currentTrack) {
        playerTitleEl.textContent = currentTrack.title;
        const stateLabel = !state.enabled ? 'Music off' : state.isPlaying ? 'Playing' : 'Paused';
        playerSubtitleEl.textContent = `BuddyDoro · ${stateLabel}${ambientHint}`;
      } else if (state.ambientMode) {
        const mode = AMBIENT_MODES.find(m => m.id === state.ambientMode);
        playerTitleEl.textContent = mode ? mode.label : 'Ambient';
        if (!state.enabled) {
          playerSubtitleEl.textContent = 'Sound off';
        } else if (ambientLive) {
          playerSubtitleEl.textContent = natureLive && rainLive
            ? 'Ambient + scene rain · select None to stop ambient'
            : natureLive
              ? 'Playing · select None to turn off'
              : 'Scene rain · pick ambient or None';
        } else {
          playerSubtitleEl.textContent = 'Starting… interact with the page if it does not play';
        }
      } else {
        playerTitleEl.textContent = 'No tracks';
        playerSubtitleEl.textContent = 'Add audio in music catalog';
      }
    }

    const showTrackProgress = state.source === 'default' && Boolean(getCurrentTrack());
    progressSectionEl.hidden = !showTrackProgress;
    if (showTrackProgress) {
      updateProgressUI();
    }

    const deckPlaying = state.source === 'spotify' ? state.isPlaying : (state.isPlaying || ambientLive);
    if (playerCardEl) {
      playerCardEl.dataset.playing = deckPlaying ? 'true' : 'false';
    }
    const boombox = document.getElementById('musicBoombox');
    if (boombox) boombox.dataset.playing = deckPlaying ? 'true' : 'false';

    // Transport: BuddyDoro prev/next/play only affect focus tracks, not ambient.
    if (defaultActive) {
      const noTracks = !BUDDYDORO_TRACKS.length;
      prevBtn.disabled = noTracks;
      playPauseBtn.disabled = noTracks;
      nextBtn.disabled = noTracks;
    } else {
      prevBtn.disabled = !spotifyReady;
      playPauseBtn.disabled = !spotifyReady;
      nextBtn.disabled = !spotifyReady;
    }
    playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
    playPauseBtn.setAttribute('aria-label', state.isPlaying ? 'Pause focus track' : 'Play focus track');

    if (trackListLabelEl) {
      if (defaultActive) {
        trackListLabelEl.hidden = false;
        trackListLabelEl.textContent = 'Focus tracks';
      } else if (state.spotifyConnected) {
        trackListLabelEl.hidden = false;
        trackListLabelEl.textContent = 'Your playlists';
      } else {
        trackListLabelEl.hidden = true;
      }
    }
    if (ambientSectionEl) ambientSectionEl.hidden = !defaultActive;

    // Show default track list or Spotify playlists depending on source.
    tracksRoot.hidden = false;

    if (defaultActive) {
      renderTrackList();
      ambientRoot.style.display = '';
      ambientRoot.hidden = false;
      renderAmbientOptions();
    } else if (state.spotifyConnected) {
      renderSpotifyPlaylists();
      ambientRoot.innerHTML = '';
      ambientRoot.style.display = 'none';
      ambientRoot.hidden = true;
    } else {
      tracksRoot.className = 'music-track-list music-playlist-browse music-spotify-connect-wrap';
      tracksRoot.innerHTML = '';

      const intro = document.createElement('div');
      intro.className = 'music-spotify-intro';
      const lead = document.createElement('p');
      lead.className = 'music-spotify-intro-lead';
      lead.textContent = 'Play your own playlists inside BuddyDoro after a quick, secure login.';
      const note = document.createElement('p');
      note.className = 'music-spotify-intro-note';
      note.innerHTML = 'Spotify <strong>Premium</strong> is required for in-browser playback.';
      intro.appendChild(lead);
      intro.appendChild(note);
      tracksRoot.appendChild(intro);

      const connectBtn = document.createElement('button');
      connectBtn.type = 'button';
      connectBtn.className = 'music-spotify-btn';
      connectBtn.textContent = 'Connect Spotify account';
      connectBtn.addEventListener('click', () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
          showNotification('Log in to BuddyDoro first, then connect Spotify.', 'error');
          return;
        }
        // Return to this exact origin/path so OAuth does not land on 127.0.0.1 while the app
        // was opened on localhost (or vice versa) — localStorage is per-origin and Buddy JWT would be missing.
        const returnTo = `${window.location.origin}${window.location.pathname}`;
        const q = new URLSearchParams({
          token,
          return_to: returnTo,
        });
        window.location.href = `${API_BASE}/spotify/login?${q.toString()}`;
      });
      tracksRoot.appendChild(connectBtn);

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'music-text-btn';
      backBtn.textContent = 'Use BuddyDoro tracks instead';
      backBtn.addEventListener('click', () => {
        sourceDefault.checked = true;
        state.source = 'default';
        _playlistsRendered = false;
        void applySourceBehavior().then(() => {
          render();
          saveState();
        });
      });
      tracksRoot.appendChild(backBtn);

      ambientRoot.innerHTML = '';
      ambientRoot.style.display = 'none';
      ambientRoot.hidden = true;
    }
  }

  // Toggle mini-player panel from floating music button.
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    state.panelOpen = !state.panelOpen;
    if (!state.panelOpen) volumePanelOpen = false;
    render();
  });

  // Close panel when clicking outside (use closest() so clicks on chip children still count as chip).
  document.addEventListener('pointerdown', (event) => {
    if (!state.panelOpen) return;
    const t = event.target;
    if (t.closest?.('#musicChip') || t.closest?.('#musicMiniPanel')) return;
    state.panelOpen = false;
    volumePanelOpen = false;
    render();
  }, true);

  // Accessibility: close volume sheet first, then panel on Escape.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.panelOpen) {
      if (volumePanelOpen) {
        volumePanelOpen = false;
        render();
        volumeSettingsBtn.focus();
        return;
      }
      state.panelOpen = false;
      render();
      chip.focus();
    }
  });

  volumeSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    volumePanelOpen = !volumePanelOpen;
    render();
    if (volumePanelOpen) musicVolSlider.focus();
  });

  volumePanelClose.addEventListener('click', (e) => {
    e.stopPropagation();
    volumePanelOpen = false;
    render();
    volumeSettingsBtn.focus();
  });

  musicVolSlider.addEventListener('input', () => {
    state.musicVolume = clamp01(Number(musicVolSlider.value) / 100);
    applyAudioVolumes();
    musicVolValueEl.textContent = `${musicVolSlider.value}%`;
    musicVolSlider.setAttribute('aria-valuenow', musicVolSlider.value);
    saveState();
  });

  ambientVolSlider.addEventListener('input', () => {
    state.ambientVolume = clamp01(Number(ambientVolSlider.value) / 100);
    applyAudioVolumes();
    ambientVolValueEl.textContent = `${ambientVolSlider.value}%`;
    ambientVolSlider.setAttribute('aria-valuenow', ambientVolSlider.value);
    saveState();
  });

  // Master toggle: all audio (focus tracks, Spotify, ambient + optional scene rain layer).
  enableToggle.addEventListener('change', async () => {
    state.enabled = enableToggle.checked;
    if (!state.enabled) {
      pauseAllAudio();
    } else {
      await syncAmbientPlayback();
      await syncRainFromScene();
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

  // Disconnect Spotify is handled via a button rendered inside tracksRoot when connected.

  // Transport: Previous — focus tracks only (ambient unchanged).
  prevBtn.addEventListener('click', async () => {
    if (state.source === 'spotify' && spotifyPlayer) {
      await spotifyPlayer.previousTrack();
    } else if (state.source === 'default') {
      const n = BUDDYDORO_TRACKS.length;
      if (!n) return;
      state.currentTrackIndex = (state.currentTrackIndex - 1 + n) % n;
      state.unifiedIndex = state.currentTrackIndex;
      setTrack(state.currentTrackIndex);
      if (state.isPlaying) await playCurrentDefaultTrack();
    }
    render();
    saveState();
  });

  // Transport: Next — focus tracks only (ambient unchanged).
  nextBtn.addEventListener('click', async () => {
    if (state.source === 'spotify' && spotifyPlayer) {
      await spotifyPlayer.nextTrack();
    } else if (state.source === 'default') {
      const n = BUDDYDORO_TRACKS.length;
      if (!n) return;
      state.currentTrackIndex = (state.currentTrackIndex + 1) % n;
      state.unifiedIndex = state.currentTrackIndex;
      setTrack(state.currentTrackIndex);
      if (state.isPlaying) await playCurrentDefaultTrack();
    }
    render();
    saveState();
  });

  // Transport: Play/Pause — BuddyDoro focus track only (ambient: None or pill only).
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
      if (UNIFIED_PLAYLIST[state.unifiedIndex]?.type === 'ambient') {
        state.unifiedIndex = state.currentTrackIndex;
      }
      await playCurrentDefaultTrack();
    } else {
      trackAudio.pause();
      state.isPlaying = false;
    }
    render();
    saveState();
  });

  // Auto-advance to next focus track when a track ends (ambient keeps running).
  trackAudio.addEventListener('ended', async () => {
    const n = BUDDYDORO_TRACKS.length;
    if (state.source !== 'default' || !state.enabled || !state.isPlaying || n === 0) return;
    state.currentTrackIndex = (state.currentTrackIndex + 1) % n;
    state.unifiedIndex = state.currentTrackIndex;
    setTrack(state.currentTrackIndex);
    await playCurrentDefaultTrack();
    render();
    saveState();
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
  applyAudioVolumes();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('spotifyConnected') === 'true') {
    state.spotifyConnected = true;
    state.source = 'spotify';
    _playlistsRendered = false;
    showNotification('Spotify account connected!', 'success');
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
  }
  const spotifyErr = urlParams.get('spotifyError');
  if (spotifyErr) {
    const spotifyErrMessages = {
      oauth_session_expired: 'Spotify login expired. Open Connect Spotify and try again.',
      token_exchange_failed: 'Spotify could not complete login. Check SPOTIFY_REDIRECT_URI matches your Spotify app settings.',
      access_denied: 'Spotify access was denied.',
      missing_authorization_code: 'Spotify did not return an authorization code. Try Connect again.',
      user_not_found: 'Could not save Spotify link to your account. Try logging in again.',
    };
    showNotification(spotifyErrMessages[spotifyErr] || `Spotify: ${spotifyErr}`, 'error');
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash || ''}`);
  }

  // Default / BuddyDoro tracks: never auto-play on page load — they start with the focus timer (see below).
  // Nature ambience: start as soon as possible after login (may require a user gesture per browser autoplay policy).
  state.isPlaying = false;
  trackAudio.pause();

  setTrack(state.currentTrackIndex);
  if (state.ambientMode) void syncAmbientPlayback();
  void syncRainFromScene();
  render();
  saveState();

  window.addEventListener('buddydoro:sceneRain', (e) => {
    sceneRainActive = Boolean(e.detail?.active);
    void syncRainFromScene();
    render();
  });

  if (typeof window.Rain?.isActive === 'function' && window.Rain.isActive()) {
    sceneRainActive = true;
    void syncRainFromScene();
  }

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
      if (UNIFIED_PLAYLIST[state.unifiedIndex]?.type === 'ambient') {
        state.unifiedIndex = state.currentTrackIndex;
      }
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

  // Retry ambient playback after first user interaction (only if a mode was explicitly chosen).
  const resumeAmbient = () => {
    if (state.ambientMode) void syncAmbientPlayback();
    void syncRainFromScene();
  };
  window.addEventListener('pointerdown', resumeAmbient, { once: true });
  window.addEventListener('keydown', resumeAmbient, { once: true });

  window.addEventListener('load', resumeAmbient);
  window.addEventListener('pageshow', resumeAmbient);

  return {
    stop() {
      pauseAllAudio();
      render();
      saveState();
    },
  };
}