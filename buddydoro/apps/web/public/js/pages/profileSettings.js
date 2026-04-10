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

// Backward-compatible message helper:
// - Adds theme classes (if you styled them)
// - ALSO sets a fallback color so you always see feedback
function setMsg(el, text, type = 'info') {
  if (!el) return;
  el.textContent = text || '';
  el.className = `pr-msg${type === 'success' ? ' is-success' : type === 'error' ? ' is-error' : ''}`;
}

async function readJsonSafe(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  // Not JSON (likely HTML). Read text so we can show a real error.
  const text = await res.text();
  throw new Error(`Expected JSON but got ${res.status}. First 80 chars: ${text.slice(0, 80)}`);
}

async function fetchMe(token) {
  const res = await fetch(`${AUTH_API_BASE}/me`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load user');
  return data;
}

async function updateProfile(token, payload) {
  const res = await fetch(`${AUTH_API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify(payload),
  });
  const data = await readJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update profile');
  return data;
}

window.addEventListener('DOMContentLoaded', async () => {
  const token = requireToken();

  const form = document.getElementById('profileForm');
  const nameInput = document.getElementById('nameInput');
  const msgEl = document.getElementById('profileMsg');

  // Works whether or not you added id="saveBtn"
  const saveBtn = form?.querySelector('button[type="submit"]');

  try {
    const me = await fetchMe(token);
    nameInput.value = me.name || '';
  } catch (err) {
    setMsg(msgEl, err.message, 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (nameInput.value || '').trim();

    if (!name) {
      setMsg(msgEl, 'Please enter a display name.', 'error');
      nameInput.focus();
      return;
    }

    setMsg(msgEl, 'Saving...', 'info');

    // Disable while saving (safe)
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.dataset.prevText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';
    }
    nameInput.disabled = true;

    try {
      // ✅ Same payload style as your working version
      const result = await updateProfile(token, { name });

      // cache for greeting
      localStorage.setItem('displayName', name);

      setMsg(msgEl, result.message || 'Saved!', 'success');
    } catch (err) {
      setMsg(msgEl, err.message, 'error');
    } finally {
      nameInput.disabled = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.prevText || 'Save';
        delete saveBtn.dataset.prevText;
      }
    }
  });
});
