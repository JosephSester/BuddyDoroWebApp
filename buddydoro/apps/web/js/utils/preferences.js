import { API_BASE } from '../api/apiClient.js';

export const SKIN_OPEN_KEY = 'buddydoro.skin.open';
export const SKIN_CLOSED_KEY = 'buddydoro.skin.closed';
export const BG_STORAGE_KEY = 'buddydoro.background';

export const DEFAULT_PREFERENCES = {
  skinOpen: 'Dragon.png',
  skinClosed: 'DragonEyesClosed.png',
  background: 'Backgrounds/BackgroundDay.jpg',
};

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePreferences(input = {}) {
  const source = input?.preferences || input;
  return {
    skinOpen: cleanString(source.skinOpen),
    skinClosed: cleanString(source.skinClosed),
    background: cleanString(source.background),
  };
}

export function getStoredPreferences({ withDefaults = true } = {}) {
  const skinOpen = cleanString(localStorage.getItem(SKIN_OPEN_KEY));
  const skinClosed = cleanString(localStorage.getItem(SKIN_CLOSED_KEY));
  const background = cleanString(localStorage.getItem(BG_STORAGE_KEY));

  return {
    skinOpen: skinOpen || (withDefaults ? DEFAULT_PREFERENCES.skinOpen : null),
    skinClosed: skinClosed || (withDefaults ? DEFAULT_PREFERENCES.skinClosed : null),
    background: background || (withDefaults ? DEFAULT_PREFERENCES.background : null),
  };
}

export function applyPreferencesToStorage(preferences = {}, { preserveExisting = false } = {}) {
  const incoming = normalizePreferences(preferences);
  const existing = getStoredPreferences({ withDefaults: false });

  const next = {
    skinOpen: incoming.skinOpen || (preserveExisting ? existing.skinOpen : null) || DEFAULT_PREFERENCES.skinOpen,
    skinClosed: incoming.skinClosed || (preserveExisting ? existing.skinClosed : null) || DEFAULT_PREFERENCES.skinClosed,
    background: incoming.background || (preserveExisting ? existing.background : null) || DEFAULT_PREFERENCES.background,
  };

  localStorage.setItem(SKIN_OPEN_KEY, next.skinOpen);
  localStorage.setItem(SKIN_CLOSED_KEY, next.skinClosed);
  localStorage.setItem(BG_STORAGE_KEY, next.background);

  return next;
}

export function hydratePreferencesFromUser(user = {}) {
  const serverPreferences = normalizePreferences(user);
  const existing = getStoredPreferences({ withDefaults: false });

  const hasMissingServerValues =
    !serverPreferences.skinOpen ||
    !serverPreferences.skinClosed ||
    !serverPreferences.background;

  const next = applyPreferencesToStorage(serverPreferences, { preserveExisting: true });

  const shouldBackfill =
    hasMissingServerValues &&
    !!(existing.skinOpen || existing.skinClosed || existing.background);

  return { preferences: next, shouldBackfill };
}

export async function saveUserPreferences(preferences = {}) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (!token) return null;

  const payload = normalizePreferences(preferences);
  const response = await fetch(`${API_BASE}/user/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Preference update failed: ${response.status}`);
  }

  const data = await response.json();
  if (data?.preferences) {
    applyPreferencesToStorage(data.preferences, { preserveExisting: true });
  }
  return data;
}
