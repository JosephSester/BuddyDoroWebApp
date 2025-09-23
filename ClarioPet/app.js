// ---------- Timer with independent modes ----------
const display   = document.getElementById('timerDisplay');
const startBtn  = document.getElementById('startBtn');
const resetBtn  = document.getElementById('resetBtn');
const modeLabel = document.getElementById('modeLabel');

const chipEls = Array.from(document.querySelectorAll('.mode-chips .chip'));
const MODES = {
  study: { label: 'Study Timer',  duration: 25 * 60 },
  short: { label: 'Short Break',  duration:  5 * 60 },
  long:  { label: 'Long Break',   duration: 15 * 60 }
};
function makeModeState(key){ const d=MODES[key].duration; return {key, duration:d, remaining:d, running:false, lastUpdated:null}; }
const state = { study:makeModeState('study'), short:makeModeState('short'), long:makeModeState('long') };
let currentMode='study', tickId=null;

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const anyRunning = () => Object.values(state).some(m=>m.running);

function ensureTick(){ if(!tickId){ tickId=setInterval(()=>{updateAllModesNow(); paint();},1000);} }
function maybeStopTick(){ if(!anyRunning() && tickId){ clearInterval(tickId); tickId=null; } }
function updateModeNow(k,now=Date.now()){
  const m=state[k]; if(!m.running) return;
  if(m.lastUpdated==null){ m.lastUpdated=now; return; }
  const d=Math.floor((now-m.lastUpdated)/1000);
  if(d>0){ m.remaining=Math.max(0,m.remaining-d); m.lastUpdated=now; if(m.remaining===0){ m.running=false; m.lastUpdated=null; } }
}
function updateAllModesNow(){ const n=Date.now(); Object.keys(state).forEach(k=>updateModeNow(k,n)); }
function paint(){
  const m=state[currentMode]; display.textContent=fmt(m.remaining);
  const atStart=m.remaining===m.duration; const running=m.running; const finished=m.remaining===0;
  startBtn.textContent=running?'Pause':(atStart||finished?'Start Timer':'Resume');
  resetBtn.disabled=!running&&atStart;
}
function start(){ const m=state[currentMode]; if(m.running) return; if(m.remaining===0) m.remaining=m.duration; m.running=true; m.lastUpdated=Date.now(); ensureTick(); paint(); }
function stop(){ const m=state[currentMode]; m.running=false; m.lastUpdated=null; maybeStopTick(); paint(); }
function reset(){ const m=state[currentMode]; m.running=false; m.remaining=m.duration; m.lastUpdated=null; maybeStopTick(); paint(); }
startBtn.addEventListener('click', ()=>{ const m=state[currentMode]; if(!m.running && m.remaining===0) m.remaining=m.duration; m.running?stop():start(); });
resetBtn.addEventListener('click', reset);
function setMode(modeKey){
  if(!MODES[modeKey]) return; updateAllModesNow(); currentMode=modeKey; modeLabel.textContent=MODES[modeKey].label;
  chipEls.forEach(ch=>{ const a=ch.dataset.mode===modeKey; ch.classList.toggle('is-active',a); ch.setAttribute('aria-pressed',a?'true':'false'); });
  anyRunning()?ensureTick():maybeStopTick(); paint();
}
chipEls.forEach(ch=>ch.addEventListener('click', ()=>setMode(ch.dataset.mode)));
setMode(currentMode);

// ---------- Topbar data ----------
const USER_NAME = 'Joe';
let dorosBalance = 1250;
const greetTextEl = document.getElementById('greetText');
const dorosAmountEl = document.getElementById('dorosAmount');
if (greetTextEl) greetTextEl.textContent = `Hello, ${USER_NAME}`;
function paintDoros(){ if (dorosAmountEl) dorosAmountEl.textContent = dorosBalance.toLocaleString(); }
paintDoros();

// ---------- Store window ----------
const storeChip    = document.getElementById('storeChip');
const storeDialog  = document.getElementById('storeDialog');
const storeBackdrop= document.getElementById('storeBackdrop');
const storeClose   = document.getElementById('storeClose');
const storeCloseBottom = document.getElementById('storeCloseBottom');

const tabs   = Array.from(document.querySelectorAll('.category-tabs .tab'));
const grid   = document.getElementById('catalogGrid');
const invUl  = document.getElementById('inventoryList');
const useBtn = document.getElementById('useSelectedBtn');

let currentCat = 'food';
let selectedSku = null;

// Simple catalog (replace emoji with real icons later)
const catalog = {
  food: [
    { sku:'food-apple', name:'Apple',     price:20,  emoji:'🍎' },
    { sku:'food-fish',  name:'Grilled Fish', price:35, emoji:'🐟' },
    { sku:'food-cake',  name:'Berry Cake',  price:60, emoji:'🍰' }
  ],
  play: [
    { sku:'play-ball',  name:'Bouncy Ball', price:25, emoji:'🟣' },
    { sku:'play-rope',  name:'Rope Toy',    price:30, emoji:'🪢' },
    { sku:'play-kite',  name:'Kite',        price:45, emoji:'🪁' }
  ],
  water: [
    { sku:'water-bottle', name:'Spring Water', price:15, emoji:'💧' },
    { sku:'water-juice',  name:'Fruit Juice',   price:28, emoji:'🧃' }
  ],
  medicine: [
    { sku:'med-bandage', name:'Bandage',   price:40, emoji:'🩹' },
    { sku:'med-potion',  name:'Potion',    price:85, emoji:'🧪' }
  ]
};

// User inventory (sku -> count)
const inventory = new Map();

function openStore(){
  storeBackdrop.hidden = false;
  storeDialog.hidden = false;
  storeChip.setAttribute('aria-expanded','true');
  // focus first interactive element
  (storeDialog.querySelector('.tab') || storeClose).focus();
  renderCatalog();
  renderInventory();
  document.addEventListener('keydown', onStoreKey);
}
function closeStore(){
  storeBackdrop.hidden = true;
  storeDialog.hidden = true;
  storeChip.setAttribute('aria-expanded','false');
  selectedSku = null;
  document.removeEventListener('keydown', onStoreKey);
  storeChip.focus();
}
function onStoreKey(e){
  if (e.key === 'Escape') closeStore();
}

storeChip.addEventListener('click', openStore);
storeBackdrop.addEventListener('click', closeStore);
storeClose.addEventListener('click', closeStore);
storeCloseBottom.addEventListener('click', closeStore);

// Tabs switching
tabs.forEach(tab=>{
  tab.addEventListener('click', ()=>{
    tabs.forEach(t=>{ t.classList.toggle('is-active', t===tab); t.setAttribute('aria-selected', t===tab ? 'true':'false'); });
    currentCat = tab.dataset.cat;
    selectedSku = null;
    renderCatalog();
  });
});

// Renderers
function renderCatalog(){
  grid.innerHTML = '';
  const items = catalog[currentCat] || [];
  items.forEach(it=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="item-emoji" aria-hidden="true">${it.emoji}</div>
      <div class="item-name">${it.name}</div>
      <div class="item-price">${it.price.toLocaleString()} Doros</div>
      <div class="item-actions">
        <button class="buy-btn" type="button">Buy</button>
        <button class="use-btn" type="button">Use</button>
      </div>
    `;
    // Buy
    card.querySelector('.buy-btn').addEventListener('click', ()=>{
      if (dorosBalance < it.price) { alert('Not enough Doros. Finish a session or buy more.'); return; }
      dorosBalance -= it.price; paintDoros();
      inventory.set(it.sku, (inventory.get(it.sku) || 0) + 1);
      renderInventory();
    });
    // Use directly from card
    card.querySelector('.use-btn').addEventListener('click', ()=>{
      if ((inventory.get(it.sku) || 0) <= 0) { alert('You do not own this item yet.'); return; }
      inventory.set(it.sku, inventory.get(it.sku) - 1);
      renderInventory();
      celebrateUse(it);
    });

    // Selection highlight
    card.addEventListener('click', (e)=>{
      // avoid selection toggle when pressing a button
      if (e.target.tagName.toLowerCase() === 'button') return;
      selectedSku = (selectedSku === it.sku) ? null : it.sku;
      highlightSelection();
    });

    card.dataset.sku = it.sku;
    grid.appendChild(card);
  });
  highlightSelection();
}

function renderInventory(){
  invUl.innerHTML = '';
  if (inventory.size === 0){
    const li = document.createElement('li');
    li.className='inventory-item';
    li.textContent = 'No items yet — earn Doros and buy something!';
    invUl.appendChild(li);
    return;
  }
  for (const [sku, count] of inventory.entries()){
    const meta = findItemBySku(sku);
    const li = document.createElement('li');
    li.className = 'inventory-item';
    li.innerHTML = `
      <span>${meta?.emoji || '🎁'} ${meta?.name || sku}</span>
      <span>x${count}</span>
    `;
    invUl.appendChild(li);
  }
}

function highlightSelection(){
  const cards = Array.from(grid.querySelectorAll('.card'));
  cards.forEach(c=>{
    const active = c.dataset.sku === selectedSku;
    c.style.outline = active ? '3px solid #2b2213' : 'none';
    c.style.outlineOffset = active ? '2px' : '0';
  });
}

function findItemBySku(sku){
  for (const cat of Object.values(catalog)){
    const found = cat.find(i => i.sku === sku);
    if (found) return found;
  }
  return null;
}

// Use Selected (footer)
useBtn.addEventListener('click', ()=>{
  if (!selectedSku){ alert('Select an item card first.'); return; }
  if ((inventory.get(selectedSku) || 0) <= 0){ alert('You do not own that item.'); return; }
  inventory.set(selectedSku, inventory.get(selectedSku) - 1);
  renderInventory();
  const meta = findItemBySku(selectedSku);
  celebrateUse(meta);
});

// Simple feedback when using an item
function celebrateUse(itemMeta){
  if (!itemMeta) return;
  // You can replace with a toast or companion reaction later
  alert(`${itemMeta.name} used! 🐉✨`);
}

// ---------- Tasks (add / delete; up to 50) ----------
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList  = document.getElementById('tasksList');
const tasks = []; let nextTaskId=1;

function renderTask(task){
  const li=document.createElement('div'); li.className='task-item'; li.setAttribute('role','listitem'); li.dataset.taskId=String(task.id);
  const name=document.createElement('span'); name.className='task-name'; name.textContent=task.name;
  const right=document.createElement('div'); right.className='task-right';
  const prog=document.createElement('span'); prog.className='task-progress'; prog.textContent=`${task.done}/${task.total}`;
  const del=document.createElement('button'); del.className='task-del'; del.type='button'; del.setAttribute('aria-label',`Delete task: ${task.name}`);
  del.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2zm1 6v8m4-8v8" fill="none" stroke="#2b2213" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  del.addEventListener('click', ()=>{ if(confirm(`Delete "${task.name}"?`)) deleteTask(task.id); });
  right.append(prog, del); li.append(name, right); return li;
}
function renderAllTasks(){ tasksList.innerHTML=''; tasks.forEach(t=>tasksList.appendChild(renderTask(t))); }
function addTask(name,total){ const t={id:nextTaskId++, name, total, done:0}; tasks.push(t); tasksList.appendChild(renderTask(t)); }
function deleteTask(id){ const i=tasks.findIndex(t=>t.id===id); if(i!==-1){ tasks.splice(i,1); renderAllTasks(); } }
addTaskBtn?.addEventListener('click', ()=>{
  if (tasks.length>=50) return alert('You can create up to 50 tasks.');
  let name=prompt('Task name?'); if(!name) return;
  let total=parseInt(prompt('How many sections in this task?'),10); if(!Number.isFinite(total)||total<=0) total=1;
  addTask(name.trim(), total);
});
