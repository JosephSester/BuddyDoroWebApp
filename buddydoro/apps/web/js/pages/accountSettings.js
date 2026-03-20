import { API_BASE } from '../api/apiClient.js';
const AUTH_API_BASE = `${API_BASE}/auth`;

function requireToken() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');  
  if (!token) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  return token;
}

// Simple message helper (keeps your old ok=true usage)
function setMsg(el, text, ok = true) {
  if (!el) return;
  el.textContent = text || '';
  el.className = `ac-msg ${ok ? 'is-success' : 'is-error'}`;
}

async function fetchMe(token) {
  const res = await fetch(`${AUTH_API_BASE}/me`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load user');
  return data;
}

async function updateAccount(token, payload) {
  const res = await fetch(`${AUTH_API_BASE}/account`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update account');
  return data;
}

// ── Replay helpers ─────────────────────────────────────
function setupFaqButtons() {
  document.getElementById('redoOnboardingBtn')?.addEventListener('click', () => {
    localStorage.removeItem('hasSeenOnboarding');
    localStorage.removeItem('hasTakenTour');
    window.location.href = 'onboarding.html';
  });

  document.getElementById('redoTourBtn')?.addEventListener('click', () => {
    localStorage.removeItem('hasTakenTour');
    window.location.href = 'index.html';
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  setupFaqButtons();

  const token = requireToken();

  const form = document.getElementById('accountForm');

  // Email fields
  const currentEmail = document.getElementById('currentEmail');
  const newEmail = document.getElementById('newEmail');
  const confirmNewEmail = document.getElementById('confirmNewEmail');

  // Password fields
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');

  const msgEl = document.getElementById('accountMsg');

  // ---- Load current email ----
  try {
    const me = await fetchMe(token);
    console.log('[accountSettings] /me returned:', me);

    if (currentEmail) currentEmail.value = me.email || '';
  } catch (err) {
    console.error('[accountSettings] load error:', err);
    setMsg(msgEl, err.message, false);
  }

  // ---- Save changes ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (newEmail?.value || '').trim();
    const confirmEmail = (confirmNewEmail?.value || '').trim();

    const curPw = currentPassword?.value || '';
    const newPw = newPassword?.value || '';
    const confirmPw = confirmNewPassword?.value || '';

    // --- Email validation (only if changing email) ---
    if (email || confirmEmail) {
      if (!email) {
        setMsg(msgEl, 'Please enter a new email address.', false);
        newEmail?.focus();
        return;
      }
      if (!confirmEmail) {
        setMsg(msgEl, 'Please confirm your new email address.', false);
        confirmNewEmail?.focus();
        return;
      }
      if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
        setMsg(msgEl, 'Email addresses do not match.', false);
        confirmNewEmail?.focus();
        return;
      }
    }

    // --- Password validation (only if changing password) ---
    if (newPw || confirmPw) {
      if (!curPw) {
        setMsg(msgEl, 'Enter your current password to change it.', false);
        currentPassword?.focus();
        return;
      }
      if (newPw.length < 8) {
        setMsg(msgEl, 'New password must be at least 8 characters.', false);
        newPassword?.focus();
        return;
      }
      if (newPw !== confirmPw) {
        setMsg(msgEl, 'New passwords do not match.', false);
        confirmNewPassword?.focus();
        return;
      }
    }

    // Build payload
    const payload = {};
    if (email) payload.email = email;
    if (newPw) {
      payload.currentPassword = curPw;
      payload.newPassword = newPw;
    }

    if (Object.keys(payload).length === 0) {
      setMsg(msgEl, 'Nothing to save.', false);
      return;
    }

    setMsg(msgEl, 'Saving...', true);

    try {
      const result = await updateAccount(token, payload);
      setMsg(msgEl, result.message || 'Saved!', true);

      // Update current email display immediately if email changed
      if (email && currentEmail) currentEmail.value = email;

      // Clear fields after success
      if (newEmail) newEmail.value = '';
      if (confirmNewEmail) confirmNewEmail.value = '';

      if (currentPassword) currentPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (confirmNewPassword) confirmNewPassword.value = '';
    } catch (err) {
      setMsg(msgEl, err.message, false);
    }
  });
});
