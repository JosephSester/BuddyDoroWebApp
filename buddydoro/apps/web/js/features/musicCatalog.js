// Phase 1 default BuddyDoro tracks (local files).
export const BUDDYDORO_TRACKS = [
  { id: 'focus-forest', title: 'Poetri', src: './assets/audio/ambient/bloom-and-decay-poetri-main-version-25597-02-30.mp3' },
  { id: 'focus-lofi', title: 'Tranquilium', src: './assets/audio/ambient/cloudette-tranquilium-main-version-36014-03-14.mp3' },
  { id: 'focus-night', title: 'Patterns', src: './assets/audio/ambient/walpapr-claude-patterns-main-version-25742-03-18.mp3' },
];

// Ambient mode options shown as icon-style radio cards in the mini player.
export const AMBIENT_MODES = [
  { id: 'forest', label: 'Forest', icon: '🌲' },
  { id: 'river', label: 'River', icon: '🌊' },
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'cricket', label: 'Cricket', icon: '🦗' },
];

// Ambient audio source mapping.
// Forest supports explicit day/night variants; other modes currently reuse one file.
export const AMBIENT_AUDIO = {
  forest: {
    day: './assets/audio/ambient/forest-ambience.wav',
    night: './assets/audio/ambient/night.wav',
  },
  river: {
    day: './assets/audio/ambient/rain.wav',
    night: './assets/audio/ambient/rain.wav',
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