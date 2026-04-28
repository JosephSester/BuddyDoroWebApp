// Phase 1 default BuddyDoro tracks (local files).
export const BUDDYDORO_TRACKS = [
  { id: 'focus-forest', title: 'Poetri', src: './assets/audio/ambient/bloom-and-decay-poetri-main-version-25597-02-30.mp3' },
  { id: 'focus-lofi', title: 'Tranquilium', src: './assets/audio/ambient/cloudette-tranquilium-main-version-36014-03-14.mp3' },
  { id: 'focus-night', title: 'Patterns', src: './assets/audio/ambient/walpapr-claude-patterns-main-version-25742-03-18.mp3' },
];

// Ambient pills (mutually exclusive). User choice is independent of time of day or background.
// Scene rain can add an extra rain layer when another ambient is selected (see music.js).
export const AMBIENT_MODES = [
  { id: 'forest', label: 'Forest' },
  { id: 'river', label: 'River' },
  { id: 'rain', label: 'Rain' },
  { id: 'cricket', label: 'Cricket' },
];

/** Loops while the scene rain overlay is active (see rain.js → buddydoro:sceneRain). */
export const RAIN_SCENE_AUDIO = {
  src: './assets/audio/ambient/rain.wav',
};

export const AMBIENT_AUDIO = {
  forest: {
    day: './assets/audio/ambient/forest-ambience.wav',
    night: './assets/audio/ambient/forest-ambience.wav',
  },
  river: {
    day: './assets/audio/ambient/riverFlowing.mp3',
    night: './assets/audio/ambient/riverFlowing.mp3',
  },
  rain: {
    day: './assets/audio/ambient/rain.wav',
    night: './assets/audio/ambient/rain.wav',
  },
  cricket: {
    day: './assets/audio/ambient/night.wav',
    night: './assets/audio/ambient/night.wav',
  },
};
