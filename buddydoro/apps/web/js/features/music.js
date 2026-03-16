import { AMBIENT_AUDIO, AMBIENT_MODES, BUDDYDORO_TRACKS } from './musicCatalog.js';
import { showNotification } from '../utils/notifications.js';

// Persisted UI/player settings for Phase 1 local music experience.
const STORAGE_KEY = 'buddydoro:musicState:v1';

export function initMusic() {
  const chip = document.getElementById('musicChip');
  const panel = document.getElementById('musicMiniPanel');
  const enableToggle = document.getElementById('musicEnabledToggle');
  const enableToggleText = panel.querySelector('.music-toggle-text');
  const prevBtn = document.getElementById('musicPrevBtn');
  const playPauseBtn = document.getElementById('musicPlayPauseBtn');
  const nextBtn = document.getElementById('musicNextBtn');
  const statusEl = document.getElementById('musicNowPlaying');
  const tracksRoot = document.getElementById('musicTrackList');
  const sourceDefault = document.getElementById('musicSourceDefault');
  const sourceSpotify = document.getElementById('musicSourceSpotify');
  const spotifyConnectBtn = document.getElementById('musicSpotifyConnectBtn');
  const spotifyHint = document.getElementById('musicSpotifyHint');
  const ambientRoot = document.getElementById('musicAmbientList');

  if (
    !chip || !panel || !enableToggle || !prevBtn || !playPauseBtn || !nextBtn
    || !statusEl || !tracksRoot || !sourceDefault || !sourceSpotify
    || !spotifyConnectBtn || !spotifyHint || !ambientRoot
  ) {
    return;
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
    source: 'default', // default | spotify
    currentTrackIndex: 0,
    isPlaying: false,
    ambientMode: 'forest',
    spotifyConnected: false,
    panelOpen: false,
  };

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

  // Source switching behavior for Default vs Spotify placeholder.
  async function applySourceBehavior() {
    if (state.source === 'spotify') {
      stopCurrentTrack();
    } else if (state.enabled && state.isPlaying) {
      await playCurrentDefaultTrack();
    }
  }

  // Renders clickable default-track list and active row state.
  function renderTrackList() {
    tracksRoot.innerHTML = '';
    if (!BUDDYDORO_TRACKS.length) {
      tracksRoot.innerHTML = '<div class="music-empty">No default tracks yet.</div>';
      return;
    }

    BUDDYDORO_TRACKS.forEach((track, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `music-track-row${idx === state.currentTrackIndex ? ' is-active' : ''}`;
      row.textContent = track.title;
      row.addEventListener('click', async () => {
        state.currentTrackIndex = idx;
        setTrack(idx);
        state.isPlaying = true;
        if (state.source === 'default') {
          await playCurrentDefaultTrack();
        }
        render();
        saveState();
      });
      tracksRoot.appendChild(row);
    });
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

    const currentTrack = getCurrentTrack();
    statusEl.textContent = state.source === 'spotify'
      ? (state.spotifyConnected ? 'Spotify connected (Phase 2 playback)' : 'Spotify selected (not connected)')
      : (currentTrack ? `${state.isPlaying ? 'Playing' : 'Paused'}: ${currentTrack.title}` : 'No default tracks');

    const defaultActive = state.source === 'default';
    prevBtn.disabled = !defaultActive || !state.enabled || !BUDDYDORO_TRACKS.length;
    // Keep Play enabled while off so users can start playback directly.
    playPauseBtn.disabled = !defaultActive || !BUDDYDORO_TRACKS.length;
    nextBtn.disabled = !defaultActive || !state.enabled || !BUDDYDORO_TRACKS.length;
    playPauseBtn.textContent = state.isPlaying ? 'Pause' : 'Play';

    tracksRoot.hidden = !defaultActive;
    spotifyHint.hidden = defaultActive;
    spotifyConnectBtn.hidden = defaultActive;
    spotifyConnectBtn.textContent = state.spotifyConnected ? 'Reconnect Spotify' : 'Connect Spotify';

    renderTrackList();
    renderAmbientOptions();
  }

  // Toggle mini-player panel from floating music button.
  chip.addEventListener('click', () => {
    state.panelOpen = !state.panelOpen;
    render();
  });

  // Close panel when clicking outside of music button/panel.
  document.addEventListener('pointerdown', (event) => {
    if (!state.panelOpen) return;
    if (panel.contains(event.target) || chip.contains(event.target)) return;
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
    await applySourceBehavior();
    render();
    saveState();
  });

  // Source selector: Spotify placeholder (full OAuth/playback in Phase 2).
  sourceSpotify.addEventListener('change', async () => {
    if (!sourceSpotify.checked) return;
    state.source = 'spotify';
    await applySourceBehavior();
    render();
    saveState();
  });

  // Placeholder connect action for future Spotify integration.
  spotifyConnectBtn.addEventListener('click', () => {
    state.spotifyConnected = true;
    showNotification('Spotify connect UI is ready. OAuth playback comes in Phase 2.', 'success');
    render();
    saveState();
  });

  // Transport controls for default track list.
  prevBtn.addEventListener('click', async () => {
    setTrack(state.currentTrackIndex - 1);
    state.isPlaying = true;
    await playCurrentDefaultTrack();
    render();
    saveState();
  });

  nextBtn.addEventListener('click', async () => {
    setTrack(state.currentTrackIndex + 1);
    state.isPlaying = true;
    await playCurrentDefaultTrack();
    render();
    saveState();
  });

  // Play/Pause: pressing Play while off turns music on and starts playback.
  playPauseBtn.addEventListener('click', async () => {
    if (state.source !== 'default') return;
    if (!state.isPlaying) {
      // UX shortcut: pressing play while off turns music on and starts playback.
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

  loadState();
  setTrack(state.currentTrackIndex);
  syncAmbientPlayback();
  render();

  // Retry ambient playback after first user interaction
  // in case initial autoplay was blocked by browser policy.
  const resumeAmbient = () => syncAmbientPlayback();
  window.addEventListener('pointerdown', resumeAmbient, { once: true });
  window.addEventListener('keydown', resumeAmbient, { once: true });

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
      render();
      saveState();
    },
  };
}