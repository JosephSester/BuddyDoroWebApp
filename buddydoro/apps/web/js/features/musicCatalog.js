// Phase 1 default BuddyDoro tracks (local files).
export const BUDDYDORO_TRACKS = [
  { id: 'focus-forest', title: 'Forest Focus', src: './assets/audio/default/forest-focus.mp3' },
  { id: 'focus-lofi', title: 'Lofi Study', src: './assets/audio/default/lofi-study.mp3' },
  { id: 'focus-night', title: 'Night Calm', src: './assets/audio/default/night-calm.mp3' },
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
    day: './assets/audio/ambient/river.mp3',
    night: './assets/audio/ambient/river.mp3',
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