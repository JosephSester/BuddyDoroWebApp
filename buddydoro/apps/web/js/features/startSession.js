// js/features/startSession.js
// 2-step session picker: pick goal → pick task → timer starts

import { startSession } from './session.js';

function getPanelId(panel) {
  return panel.querySelector('.tasks-list')?.dataset.panelId || panel.id || null;
}

function buildModal() {
  const backdrop = document.createElement('div');
  backdrop.id = 'startSessionBackdrop';
  backdrop.className = 'ss-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.id = 'startSessionModal';
  modal.className = 'ss-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.hidden = true;
  modal.innerHTML = `
    <div id="ssStep1" class="ss-step">
      <div class="ss-header">
        <h2 class="ss-title">Start a Session</h2>
        <button class="ss-close-btn" type="button" aria-label="Close">&#x2715;</button>
      </div>
      <p class="ss-subtitle">Pick a goal to work on</p>
      <ul id="ssGoalList" class="ss-list" role="listbox" aria-label="Goals"></ul>
      <div class="ss-actions">
        <button id="ssNextBtn" class="btn-primary ss-btn" type="button" disabled>Next →</button>
      </div>
    </div>

    <div id="ssStep2" class="ss-step" hidden>
      <div class="ss-header">
        <button id="ssBackBtn" class="ss-back-btn" type="button">← Back</button>
        <button class="ss-close-btn" type="button" aria-label="Close">&#x2715;</button>
      </div>
      <p id="ssGoalLabel" class="ss-goal-label"></p>
      <p class="ss-subtitle">Pick a task to focus on</p>
      <ul id="ssTaskList" class="ss-list" role="listbox" aria-label="Tasks"></ul>
      <div class="ss-actions">
        <button id="ssStartBtn" class="btn-primary ss-btn" type="button" disabled>▶ Start Session</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  return { backdrop, modal };
}

export function initStartSession() {
  const triggerBtn = document.getElementById('startSessionBtn');
  if (!triggerBtn) return;

  const { backdrop, modal } = buildModal();

  const step1     = modal.querySelector('#ssStep1');
  const step2     = modal.querySelector('#ssStep2');
  const goalList  = modal.querySelector('#ssGoalList');
  const taskList  = modal.querySelector('#ssTaskList');
  const nextBtn   = modal.querySelector('#ssNextBtn');
  const startBtn  = modal.querySelector('#ssStartBtn');
  const backBtn   = modal.querySelector('#ssBackBtn');
  const goalLabel = modal.querySelector('#ssGoalLabel');

  let selectedGoalId = null;
  let selectedTaskId = null;

  function open() {
    selectedGoalId = null;
    selectedTaskId = null;
    nextBtn.disabled = true;
    step1.hidden = false;
    step2.hidden = true;
    populateGoals();
    modal.hidden = false;
    backdrop.hidden = false;
  }

  function close() {
    modal.hidden = true;
    backdrop.hidden = true;
  }

  function populateGoals() {
    goalList.innerHTML = '';
    const panels = document.querySelectorAll('#tasksStack .tasks-panel');
    if (!panels.length) {
      goalList.innerHTML = '<li class="ss-empty">No goals yet. Create one first!</li>';
      return;
    }
    panels.forEach(panel => {
      const panelId   = getPanelId(panel);
      const title     = panel.querySelector('.tasks-title')?.textContent?.trim() || 'Goal';
      const taskCount = panel.querySelectorAll('.tasks-list .task-card').length;

      const li = document.createElement('li');
      li.className = 'ss-item';
      li.setAttribute('role', 'option');
      li.dataset.id = panelId;
      li.innerHTML = `
        <span class="ss-item-name">${title}</span>
        <span class="ss-item-meta">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
      `;
      li.addEventListener('click', () => {
        goalList.querySelectorAll('.ss-item').forEach(i => i.classList.remove('is-selected'));
        li.classList.add('is-selected');
        selectedGoalId = panelId;
        nextBtn.disabled = false;
      });
      goalList.appendChild(li);
    });
  }

  function populateTasks(panelId) {
    taskList.innerHTML = '';
    // Read task cards directly from the DOM panel — avoids panelId type mismatches
    let targetPanel = null;
    document.querySelectorAll('#tasksStack .tasks-panel').forEach(p => {
      if (getPanelId(p) === panelId) targetPanel = p;
    });

    if (!targetPanel) {
      taskList.innerHTML = '<li class="ss-empty">Goal not found.</li>';
      return;
    }

    const cards = targetPanel.querySelectorAll('.tasks-list .task-card');
    if (!cards.length) {
      taskList.innerHTML = '<li class="ss-empty">No tasks in this goal. Add one first!</li>';
      return;
    }

    cards.forEach(card => {
      const taskId   = card.dataset.taskId;
      const taskName = card.querySelector('.task-name')?.textContent?.trim() || 'Task';
      const isDone   = card.classList.contains('is-session-done');

      const li = document.createElement('li');
      li.className = 'ss-item' + (isDone ? ' is-done' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', String(isDone));
      li.dataset.id = taskId;
      li.innerHTML = isDone
        ? `<span class="ss-item-name">✓ ${taskName}</span>`
        : `<span class="ss-item-name">${taskName}</span>`;

      if (!isDone) {
        li.addEventListener('click', () => {
          taskList.querySelectorAll('.ss-item').forEach(i => i.classList.remove('is-selected'));
          li.classList.add('is-selected');
          selectedTaskId = taskId;
          startBtn.disabled = false;
        });
      }
      taskList.appendChild(li);
    });
  }

  nextBtn.addEventListener('click', () => {
    if (!selectedGoalId) return;
    let title = 'Goal';
    document.querySelectorAll('#tasksStack .tasks-panel').forEach(p => {
      if (getPanelId(p) === selectedGoalId)
        title = p.querySelector('.tasks-title')?.textContent?.trim() || 'Goal';
    });
    goalLabel.textContent = title;
    selectedTaskId = null;
    startBtn.disabled = true;
    populateTasks(selectedGoalId);
    step1.hidden = true;
    step2.hidden = false;
  });

  backBtn.addEventListener('click', () => {
    step2.hidden = true;
    step1.hidden = false;
  });

  startBtn.addEventListener('click', (e) => {
    if (!selectedTaskId || !selectedGoalId) return;
    e.stopPropagation();

    // Build ordered task list from the selected goal panel
    let goalTitle = 'Goal';
    const tasks = [];
    document.querySelectorAll('#tasksStack .tasks-panel').forEach(p => {
      if (getPanelId(p) !== selectedGoalId) return;
      goalTitle = p.querySelector('.tasks-title')?.textContent?.trim() || 'Goal';
      p.querySelectorAll('.tasks-list .task-card').forEach(card => {
        tasks.push({
          id:   card.dataset.taskId,
          name: card.querySelector('.task-name')?.textContent?.trim() || 'Task',
        });
      });
    });

    startSession({ goalPanelId: selectedGoalId, goalTitle, tasks, startTaskId: selectedTaskId });
    close();
  });

  modal.querySelectorAll('.ss-close-btn').forEach(btn => btn.addEventListener('click', close));
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  triggerBtn.addEventListener('click', open);
}
