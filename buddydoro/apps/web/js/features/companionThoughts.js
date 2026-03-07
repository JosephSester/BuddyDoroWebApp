const ORANGE_MIN = 4;
const ORANGE_MAX = 7;
const RED_MAX = 3;

const MOTIVATION_LINES = [
  "You're doing great!",
  'Keep going, one step at a time.',
  'Nice effort. Stay with it.',
  'You got this. Keep studying.'
];

const STUDY_LINES = [
  "Let's do one more focus session.",
  'Stay with your plan. I believe in you.',
  'A little progress right now is still progress.'
];

let root = null;
let textEl = null;
let hideTimer = 0;
let loopTimer = 0;
let lastMessage = '';
let getActiveTaskRef = null;

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function currentStatuses() {
  return window.CompanionStatus?.get?.() || null;
}

function messageFromNeeds(statuses) {
  if (!statuses) return '';

  const needs = [];
  const hunger = Number(statuses.hunger || 0);
  const thirst = Number(statuses.thirst || 0);
  const happiness = Number(statuses.happiness || 0);

  if (hunger >= ORANGE_MIN && hunger <= ORANGE_MAX) needs.push('Can you feed me?');
  if (thirst >= ORANGE_MIN && thirst <= ORANGE_MAX) needs.push('Can I have some water?');
  if (happiness >= ORANGE_MIN && happiness <= ORANGE_MAX) needs.push('Can you play with me?');

  if (hunger <= RED_MAX) needs.push("I'm really hungry...");
  if (thirst <= RED_MAX) needs.push("I'm really thirsty...");
  if (happiness <= RED_MAX) needs.push('I need some play time...');

  return needs.length ? pickRandom(needs) : '';
}

function messageFromTask() {
  const task = getActiveTaskRef?.();
  const name = String(task?.name || '').trim();
  if (!name) return '';
  return `Don't forget to focus on ${name} today.`;
}

function nextMessage() {
  const statuses = currentStatuses();

  const needsMessage = messageFromNeeds(statuses);
  if (needsMessage && Math.random() < 0.7) return needsMessage;

  if (Math.random() < 0.45) {
    const taskMessage = messageFromTask();
    if (taskMessage) return taskMessage;
  }

  const fromStudy = Math.random() < 0.5 ? pickRandom(STUDY_LINES) : pickRandom(MOTIVATION_LINES);
  return fromStudy;
}

function findDragonEl() {
  return (
    document.getElementById('dragon') ||
    document.querySelector('.dragon') ||
    document.querySelector('img[alt*="Dragon" i]') ||
    null
  );
}

function positionNearDragon() {
  if (!root) return;
  const dragon = findDragonEl();
  const scene = document.getElementById('scene') || document.body;
  if (!dragon || !scene) return;

  const d = dragon.getBoundingClientRect();
  const s = scene.getBoundingClientRect();

  const left = d.left - s.left + d.width * 0.72;
  const top = d.top - s.top - 22;

  root.style.left = `${Math.round(left)}px`;
  root.style.top = `${Math.round(top)}px`;
}

function showBubble(message) {
  if (!root || !textEl || !message) return;
  if (message === lastMessage && Math.random() < 0.6) return;
  lastMessage = message;
  textEl.textContent = message;
  root.hidden = false;
  root.classList.add('is-visible');

  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (!root) return;
    root.classList.remove('is-visible');
  }, 9000);
}

function step() {
  positionNearDragon();
  showBubble(nextMessage());
}

function mount() {
  if (root) return;
  const scene = document.getElementById('scene') || document.body;
  root = document.createElement('aside');
  root.className = 'companion-thought';
  root.hidden = true;
  root.innerHTML = `
    <div class="companion-thought-text" aria-live="polite"></div>
    <div class="companion-thought-tail" aria-hidden="true"></div>
  `;
  textEl = root.querySelector('.companion-thought-text');
  scene.appendChild(root);
}

export function initCompanionThoughts({ getActiveTask } = {}) {
  getActiveTaskRef = typeof getActiveTask === 'function' ? getActiveTask : () => null;
  mount();
  positionNearDragon();
  window.addEventListener('resize', positionNearDragon);
  window.addEventListener('focus', step);

  clearInterval(loopTimer);
  loopTimer = window.setInterval(step, 75 * 1000);

  window.setTimeout(step, 3500);
}
