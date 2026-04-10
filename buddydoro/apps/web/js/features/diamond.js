let diamondBalance = 0;

function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

function getBalance() {
  return diamondBalance;
}

function setBalance(amount) {
  diamondBalance = Math.max(0, Number(amount) || 0);
  updateUI();
}

async function changeBalance(delta) {

  if (delta === 0) return;

    const oldBalance = diamondBalance;
    diamondBalance += delta;
    updateUI();

  try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const res = await fetch('http://localhost:3000/api/user/diamonds', {
        method: 'PATCH',
        headers: {
             'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
           },
        body: JSON.stringify({ delta })
     });

    if (!res.ok) throw new Error('Diamond update failed');

    const data = await res.json();
    setBalance(data.diamonds);
    updateUI();
    } catch (err) {
      console.error('Failed to sync Diamonds:', err);
      diamondBalance = oldBalance; // Rollback
      updateUI();
    }
}

async function addDiamond(amount) {
  await changeBalance(amount);
}

async function spendDiamond(amount) {
  if (diamondBalance < amount) return false;
  await changeBalance(-amount);
  return true;
}

function updateUI() {
  const el = document.getElementById('diamondAmount');
  if (el) el.textContent = formatNumber(diamondBalance);
}

window.Diamonds = {
  getBalance,
  setBalance,
  addDiamond,
  spendDiamond
};

