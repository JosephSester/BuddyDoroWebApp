const API_BASE = 'http://localhost:3000/api/auth';

function requireToken() {
  const token = localStorage.getItem('authToken');
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

  el.classList.remove('is-info', 'is-success', 'is-error');
  if (type === 'success') el.classList.add('is-success');
  else if (type === 'error') el.classList.add('is-error');
  else el.classList.add('is-info');

  // fallback colors (so feedback is always visible)
  el.style.color =
    type === 'success' ? 'green' :
    type === 'error' ? 'crimson' :
    '#2b2213';
}

async function fetchMe(token) {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load user');
  return data;
}

async function updateProfile(token, payload) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
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
