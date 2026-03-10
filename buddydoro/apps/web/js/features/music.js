import { BUDDYDORO_TRACKS } from './musicCatalog.js';

export function initMusic() {
  const chip = document.getElementById('musicChip');
  const backdrop = document.getElementById('musicBackdrop');
  const dialog = document.getElementById('musicDialog');
  const closeBtn = document.getElementById('musicClose');
  const closeBottom = document.getElementById('musicCloseBottom');
  const list = document.getElementById('musicTrackList');
  const empty = document.getElementById('musicEmpty');

  if (!chip || !backdrop || !dialog || !list || !empty) return;

  const audio = new Audio();
  let currentTrackId = null;

  function renderList() {
    list.innerHTML = '';
    if (BUDDYDORO_TRACKS.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    BUDDYDORO_TRACKS.forEach((track) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'music-track-row';
      row.textContent = track.title;
      row.addEventListener('click', () => {
        currentTrackId = track.id;
        audio.src = track.src;
        audio.play().catch(() => {});
      });
      list.appendChild(row);
    });
  }

  function open() {
    backdrop.hidden = false;
    dialog.hidden = false;
    chip.setAttribute('aria-expanded', 'true');
    renderList();
  }

  function close() {
    backdrop.hidden = true;
    dialog.hidden = true;
    chip.setAttribute('aria-expanded', 'false');
    chip.focus();
  }

  chip.addEventListener('click', open);
  backdrop.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);
  closeBottom?.addEventListener('click', close);

  return {
    stop: () => audio.pause(),
    getCurrentTrackId: () => currentTrackId,
  };
}