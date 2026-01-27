const API_BASE = 'http://localhost:3000/api/auth';

function requireToken() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  return token;
}

function setMsg(el, text, ok = true) {
  el.textContent = text;
  el.style.color = ok ? 'green' : 'crimson';
}

async function fetchMe(token) {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load user');
  return data;
}

async function updateAccount(token, payload) {
  const res = await fetch(`${API_BASE}/account`, {
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

window.addEventListener('DOMContentLoaded', async () => {
  const token = requireToken();

  const form = document.getElementById('accountForm');
  const emailInput = document.getElementById('emailInput');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const msgEl = document.getElementById('accountMsg');

  try {
    const me = await fetchMe(token);
    emailInput.value = me.email || '';
    // Your /me currently returns name, doros, diamonds (no email).
    // If you want to prefill email, we’ll update /me to include it.
    // For now: leave blank or set placeholder.
    emailInput.placeholder = 'Enter new email';
  } catch (err) {
    setMsg(msgEl, err.message, false);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg(msgEl, 'Saving...', true);

    try {
      const payload = {};
      if (emailInput.value.trim()) payload.email = emailInput.value.trim();
      if (newPassword.value) {
        payload.currentPassword = currentPassword.value;
        payload.newPassword = newPassword.value;
      }

      if (Object.keys(payload).length === 0) {
        setMsg(msgEl, 'Nothing to save.', false);
        return;
      }

      const result = await updateAccount(token, payload);
      setMsg(msgEl, result.message || 'Saved!', true);

      // clear password fields after success
      currentPassword.value = '';
      newPassword.value = '';
    } catch (err) {
      setMsg(msgEl, err.message, false);
    }
  });
});
