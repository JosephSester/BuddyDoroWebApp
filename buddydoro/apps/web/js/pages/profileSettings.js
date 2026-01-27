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

  try {
    const me = await fetchMe(token);
    nameInput.value = me.name || '';
  } catch (err) {
    setMsg(msgEl, err.message, false);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg(msgEl, 'Saving...', true);

    try {
      const result = await updateProfile(token, { name: nameInput.value });
      setMsg(msgEl, result.message || 'Saved!', true);
    } catch (err) {
      setMsg(msgEl, err.message, false);
    }
  });
});
