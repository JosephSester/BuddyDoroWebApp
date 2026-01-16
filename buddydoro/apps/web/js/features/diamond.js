// diamond.js
const STORAGE_KEY = 'buddyDoro.diamondBalance';

function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

function getBalance() {
  return Number(localStorage.getItem(STORAGE_KEY)) || 0;
}

function setBalance(amount) {
  localStorage.setItem(STORAGE_KEY, amount);
  updateUI();
}

function add(amount) {
  setBalance(getBalance() + amount);
}

function spend(amount) {
  const current = getBalance();
  if (current < amount) return false;
  setBalance(current - amount);
  return true;
}

function updateUI() {
  const el = document.getElementById('diamondAmount');
  if (el) el.textContent = formatNumber(getBalance());
}

function init() {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, '0');
  }
  updateUI();
}

window.Diamonds = {
  init,
  getBalance,
  setBalance,
  add,
  spend
};

document.addEventListener('DOMContentLoaded', init);
