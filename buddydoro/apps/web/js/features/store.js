// Store dialog. Requires callbacks to read/update Doros.
import { purchaseItem } from '../api/inventoryService.js';
import { showNotification, setBusy } from '../utils/notifications.js';
import { fetchCatalog } from '../api/storeService.js';
import { setDragonSkin } from './dragon.js';
import {
  BG_STORAGE_KEY,
  applyPreferencesToStorage,
  getStoredPreferences,
  saveUserPreferences,
} from '../utils/preferences.js';


console.log('[Store Init] storeChip:', !!document.getElementById('storeChip'));
console.log('[Store Init] storeDialog:', !!document.getElementById('storeDialog'));
// ... same for others


export function initStore({ getDoros, spendDoros }) {
  const storeChip = document.getElementById('storeChip');
  const storeDialog = document.getElementById('storeDialog');
  const storeBackdrop = document.getElementById('storeBackdrop');
  const storeClose = document.getElementById('storeClose');
  const storeCloseBottom = document.getElementById('storeCloseBottom');

  const tabs = Array.from(document.querySelectorAll('.category-tabs .tab'));
  const grid = document.getElementById('catalogGrid');
  const storeDorosBalanceEl = document.getElementById('storeDorosBalance');
  const storeDiamondsBalanceEl = document.getElementById('storeDiamondsBalance');

  let currentCat = 'food';
  let selectedSku = null;
  let allItems = [];           // ← Loaded from API
  let itemsByCategory = {};    // ← Grouped for tabs

  const SKINS = [
  'Alien.png',
  'Axolotyl.png',
  'Bigfoot.png',
  'Butterfly.png',
  'Capybara.png',
  'DragonSkin.png',
  'Frog.png',
  'PrayingMantis.png',
  'Robot.png',
  'RockCreature.png',
  'Vampire.png',
  'IceCream.png',
  'Strawberry.png',
  'Werewolf.png'
];

  // ----------------------------
  // NEW: Backgrounds (day shown in store, night auto-applied at night)
  // ----------------------------
  const BACKGROUNDS = [
    { key: 'Forest', imageUrl: 'Backgrounds/BackgroundDay.jpg', day: 'BackgroundDay.jpg', night: 'BackgroundNight.png', isDefault: true, dragonBottom: '16vh', deadButtonBottom: '13vh' },
    { key: 'African', imageUrl: 'Backgrounds/AfricanBackgroundDay.png', day: 'AfricanBackgroundDay.png', night: 'AfricanBackgroundNight.png', dragonBottom: '15vh', deadButtonBottom: '12vh' },
    { key: 'Arctic', imageUrl: 'Backgrounds/ArcticBackgroundDay.png', day: 'ArcticBackgroundDay.png', night: 'ArcticBackgroundNight.png', dragonBottom: '15vh', deadButtonBottom: '12vh' },
    { key: 'Beach', imageUrl: 'Backgrounds/BeachBackgroundDay.png', day: 'BeachBackgroundDay.png', night: 'BeachBackgroundNight.png', dragonBottom: '12vh', deadButtonBottom: '9vh' },
    { key: 'Cemetery', imageUrl: 'Backgrounds/CemeteryBackgroundDay.png', day: 'CemeteryBackgroundDay.png', night: 'CemeteryBackgroundNight.png', dragonBottom: '15vh', deadButtonBottom: '12vh' },
    { key: 'Desert', imageUrl: 'Backgrounds/DesertBackgroundDay.png', day: 'DesertBackgroundDay.png', night: 'DesertBackgroundNight.png', dragonBottom: '13vh', deadButtonBottom: '10vh' },
    { key: 'Everglades', imageUrl: 'Backgrounds/EvergladesBackgroundDay.png', day: 'EvergladesBackgroundDay.png', night: 'EvergladesBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Floating Island', imageUrl: 'Backgrounds/FloatingIslandBackgroundDay.png', day: 'FloatingIslandBackgroundDay.png', night: 'FloatingIslandBackgroundNight.png', dragonBottom: '27vh', deadButtonBottom: '24vh' },
    { key: 'Inca', imageUrl: 'Backgrounds/IncaBackgroundDay.png', day: 'IncaBackgroundDay.png', night: 'IncaBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Japanese', imageUrl: 'Backgrounds/JapaneseBackgroundDay.png', day: 'JapaneseBackgroundDay.png', night: 'JapaneseBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Jungle', imageUrl: 'Backgrounds/JungleBackgroundDay.png', day: 'JungleBackgroundDay.png', night: 'JungleBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Mayan', imageUrl: 'Backgrounds/MayanBackgroundDay.png', day: 'MayanBackgroundDay.png', night: 'MayanBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Mountain', imageUrl: 'Backgrounds/MountainBackgroundDay.png', day: 'MountainBackgroundDay.png', night: 'MountainBackgroundNight.png', dragonBottom: '16vh', deadButtonBottom: '13vh' },
    { key: 'Rainforest', imageUrl: 'Backgrounds/RainforestBackgroundDay.png', day: 'RainforestBackgroundDay.png', night: 'RainforestBackgroundNight.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Inner Earth', imageUrl: 'Backgrounds/InnerEarthBackground.png', day: 'InnerEarthBackground.png', night: 'InnerEarthBackground.png', dragonBottom: '15vh', deadButtonBottom: '12vh' },
    { key: 'Moon', imageUrl: 'Backgrounds/MoonBackground.png', day: 'MoonBackground.png', night: 'MoonBackground.png', dragonBottom: '14vh', deadButtonBottom: '11vh' },
    { key: 'Mars', imageUrl: 'Backgrounds/MarsBackgroundDay.png', day: 'MarsBackgroundDay.png', night: 'MarsBackgroundDay.png', dragonBottom: '13vh', deadButtonBottom: '10vh' },
    { key: 'Dessert Land', imageUrl: 'Backgrounds/DessertLandBackground.png', day: 'DessertLandBackground.png', night: 'DessertLandBackground.png', dragonBottom: '13vh', deadButtonBottom: '10vh' },
  ];

  function getSceneEl() {
    return document.getElementById('scene');
  }

  // We try to detect "night" in a way that won't fight your existing backgroundnight.js.
  // If your app adds a class like "is-night" to body/scene, we use that.
  // Otherwise we fallback to a simple hour rule.
  function isNightNow() {
    const scene = getSceneEl();
    const body = document.body;

    const hasNightClass =
      body.classList.contains('is-night') ||
      body.classList.contains('night') ||
      (scene && (scene.classList.contains('is-night') || scene.classList.contains('night')));

    if (hasNightClass) return true;

    // Fallback hour rule (adjust if your app uses different hours)
    const h = new Date().getHours();
    return (h >= 19 || h < 6);
  }

  function buildBgPath(file) {
    // Your images live in: apps/web/public/assets/artwork/Backgrounds/
    return `./assets/artwork/Backgrounds/${file}`;
  }

  function applyBackground(bg) {
    const scene = getSceneEl();
    if (!scene) return;

    const night = isNightNow();
    const fileToUse = night ? (bg.night || bg.day) : bg.day;
    const url = buildBgPath(fileToUse);

    // Apply inline background image (works even if backgroundnight.js exists)
    scene.style.backgroundImage = `url("${url}")`;
    scene.style.backgroundRepeat = 'no-repeat';
    scene.style.backgroundPosition = 'center bottom';
    scene.style.backgroundSize = 'cover';
    scene.style.setProperty('--dragon-bottom', bg.dragonBottom || '16vh');
    scene.style.setProperty('--companion-dead-bottom', bg.deadButtonBottom || '13vh');

    // Tag the scene with the background key so dragon.css can adjust
    // the character's vertical position per-background
    scene.dataset.bg = bg.key;
  }

  function saveSelectedBackground(imageUrl) {
    localStorage.setItem(BG_STORAGE_KEY, imageUrl);
  }

  function loadSelectedBackgroundKey() {
    return localStorage.getItem(BG_STORAGE_KEY);
  }

  function getSelectedBackground() {
    const key = loadSelectedBackgroundKey() || getStoredPreferences().background;
    return BACKGROUNDS.find(b => b.imageUrl === key) || BACKGROUNDS.find(b => b.isDefault) || null;
  }

  // Keep background synced if your day/night logic flips classes on <body> or #scene.
  function startBackgroundNightWatcher() {
    const scene = getSceneEl();
    const body = document.body;

    const reapply = () => {
      const selected = getSelectedBackground();
      if (selected) applyBackground(selected);
    };

    // Watch for class changes (common pattern for day/night toggles)
    const obs = new MutationObserver(() => reapply());
    obs.observe(body, { attributes: true, attributeFilter: ['class'] });
    if (scene) obs.observe(scene, { attributes: true, attributeFilter: ['class'] });

    // Also re-check periodically as a safe fallback
    setInterval(reapply, 60 * 1000);
  }

    // Start background watcher once (keeps equipped background synced with day/night)
  startBackgroundNightWatcher();

  // If user already equipped a background previously, apply it on load
  const previouslySelected = getSelectedBackground();
  if (previouslySelected) {
    applyBackground(previouslySelected);
  }

function niceNameFromFile(filename) {
  if (filename === 'DragonSkin.png') return 'Dragon';
  return filename
    .replace('.png', '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

  if (!storeChip) {
    console.error('[Store] storeChip not found');
    return;
  }

  // Store is buy-only for catalog items.
  // Currency defaults to Doros unless explicitly marked as Diamonds.
  function getItemCurrency(item) {
    return item?.currency === 'diamonds' ? 'diamonds' : 'doros';
  }

  // Shared display formatter so cards always show correct currency label.
  function formatCatalogPrice(item) {
    return `${(item.price || 0).toLocaleString()} ${getItemCurrency(item) === 'diamonds' ? 'Diamonds' : 'Doros'}`;
  }

  // Right-side balances panel mirrors current live balances from global sources.
  function paintStoreBalances() {
    const doros = window.earnDoros?.getBalance?.() ?? getDoros?.() ?? 0;
    const diamonds = window.Diamonds?.getBalance?.() ?? 0;

    if (storeDorosBalanceEl) {
      storeDorosBalanceEl.textContent = Number(doros).toLocaleString('en-US');
    }
    if (storeDiamondsBalanceEl) {
      storeDiamondsBalanceEl.textContent = Number(diamonds).toLocaleString('en-US');
    }
  }

  async function openStore() {
    storeBackdrop.hidden = false;
    storeDialog.hidden = false;
    storeChip.setAttribute('aria-expanded', 'true');
    (storeDialog.querySelector('.tab') || storeClose).focus();
    setBusy(true, 'Loading store...');

    // Load catalog only (inventory view was removed from store panel).
    try {
      const apiItems = await fetchCatalog();
      allItems = apiItems;
      itemsByCategory = apiItems.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});
    } catch (error) {
      console.error('Failed to load catalog:', error);
      showNotification('Failed to load store items', 'error');
      allItems = [];
      itemsByCategory = {};
    }

    setBusy(false);
    paintStoreBalances();

    // Activate default tab or first available
    const defaultTab = tabs.find(t => t.dataset.cat === currentCat) || tabs[0];
    if (defaultTab) {
      defaultTab.click();
    } else {
      renderCatalog([]);
    }

    document.addEventListener('keydown', onStoreKey);
  }

  function closeStore() {
    storeBackdrop.hidden = true;
    storeDialog.hidden = true;
    storeChip.setAttribute('aria-expanded', 'false');
    selectedSku = null;
    document.removeEventListener('keydown', onStoreKey);
    storeChip.focus();
  }

  function onStoreKey(e) {
    if (e.key === 'Escape') closeStore();
  }


  storeChip?.addEventListener('click', openStore);
  storeBackdrop?.addEventListener('click', closeStore);
  storeClose?.addEventListener('click', closeStore);
  storeCloseBottom?.addEventListener('click', closeStore);

  tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });

    const cat = tab.dataset.cat;

    // NEW: Skins tab renders the skins catalog inside the store window.
    if (cat === 'skins') {
      currentCat = 'skins';
      selectedSku = null;
      renderSkinsCatalog();   // <-- you will add this function in store.js
      return;
    }

    // Backgrounds tab  ✅ goes right here
    if (cat === 'backgrounds') {
      currentCat = 'backgrounds';
      selectedSku = null;
      renderBackgroundsCatalog();
      return;
    }

    // Normal store category behavior
    currentCat = cat;
    selectedSku = null;
    renderCatalog(itemsByCategory[currentCat] || []);
  });
});

    function renderSkinsCatalog() {
    grid.innerHTML = '';

    // If you later want “selected skin” highlighting, use selectedSku
    SKINS.forEach(file => {
      const name = niceNameFromFile(file);
      const card = document.createElement('div');
      card.className = 'card skin-card';
      card.dataset.sku = file;

      card.innerHTML = `
        <div class="skin-thumb">
          <img src="./assets/artwork/Skins/${file}" alt="${name}" />

        </div>
        <div class="item-name">${name}</div>
        <div class="item-price">Skin</div>
        <div class="item-actions">
          <button class="use-btn" type="button">Equip</button>
        </div>
      `;

      // Equip button
      card.querySelector('.use-btn').addEventListener('click', () => {
        // For now: open = closed = same image until you add closed-eye versions
        const preferences = applyPreferencesToStorage({
          skinOpen: `Skins/${file}`,
          skinClosed: `Skins/${file}`,
        }, { preserveExisting: true });
        setDragonSkin({ open: preferences.skinOpen, closed: preferences.skinClosed });
        saveUserPreferences(preferences).catch(error => {
          console.warn('Skin preference sync failed:', error);
        });
        showNotification(`${name} equipped! 🐉✨`, 'success');
      });

      // Optional: click card (select highlight)
      card.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        selectedSku = (selectedSku === file) ? null : file;
        highlightSelection();
      });

      grid.appendChild(card);
    });

    highlightSelection();
  }

    function renderBackgroundsCatalog() {
    grid.innerHTML = '';

    BACKGROUNDS.forEach(bg => {
      const name = bg.key; // already nice
      const card = document.createElement('div');
      card.className = 'card background-card';
      card.dataset.sku = bg.key;

      // IMPORTANT: show ONLY the DAY image in the store UI
      const thumbSrc = buildBgPath(bg.day);

      card.innerHTML = `
        <div class="skin-thumb">
          <img src="${thumbSrc}" alt="${name} background" />
        </div>
        <div class="item-name">${name}</div>
        <div class="item-price">Background</div>
        <div class="item-actions">
          <button class="use-btn" type="button">Equip</button>
        </div>
      `;

      // Equip button applies immediately AND saves choice
      card.querySelector('.use-btn').addEventListener('click', () => {
        if (bg.isDefault) {
          // Clear custom selection so backgroundnight.js resumes day/night switching
          const preferences = applyPreferencesToStorage({
            background: bg.imageUrl,
          }, { preserveExisting: true });
          saveSelectedBackground(preferences.background);
          // Remove bg tag so dragon uses the default Forest bottom position
          const scene = getSceneEl();
          if (scene) {
            scene.removeAttribute('data-bg');
            scene.style.backgroundPosition = 'center bottom';
            scene.style.removeProperty('--dragon-bottom');
            scene.style.removeProperty('--companion-dead-bottom');
          }
          selectedSku = null;
          highlightSelection();
          showNotification(`Default Forest background equipped! 🌲✨`, 'success');
          return;
        }
        saveSelectedBackground(bg.imageUrl);
        applyBackground(bg);
        saveUserPreferences({ background: bg.imageUrl }).catch(error => {
          console.warn('Background preference sync failed:', error);
        });
        showNotification(`${name} background equipped! 🌄✨`, 'success');
      });

      // Optional: click card to select outline highlight
      card.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        selectedSku = (selectedSku === bg.key) ? null : bg.key;
        highlightSelection();
      });

      grid.appendChild(card);
    });

    // Highlight current selection from storage (if any)
    const selected = getSelectedBackground();
    if (selected) selectedSku = selected.key;

    highlightSelection();
  }


  function renderCatalog(categoryItems = []) {
    grid.innerHTML = '';
    
    if (categoryItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-message';
      empty.textContent = 'No items in this category yet.';
      grid.appendChild(empty);
      return;
    }

    categoryItems.forEach(it => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.sku = it.sku;
      card.innerHTML = `
        <div class="item-emoji" aria-hidden="true">${it.emoji || '🎁'}</div>
        <div class="item-name">${it.name || it.sku}</div>
        <div class="item-price">${formatCatalogPrice(it)}</div>
        <div class="item-actions">
          <button class="buy-btn" type="button">Buy</button>
        </div>
      `;

      card.querySelector('.buy-btn').addEventListener('click', async () => {
        const currency = getItemCurrency(it);
        const price = Number(it.price || 0);

        // Validate against the correct balance before attempting purchase.
        if (currency === 'doros' && getDoros() < price) {
          showNotification('Not enough Doros', 'error');
          return;
        }
        if (currency === 'diamonds' && (window.Diamonds?.getBalance?.() ?? 0) < price) {
          showNotification('Not enough Diamonds', 'error');
          return;
        }

        try {
          setBusy(true, `Buying ${it.name}...`);
          // Spend from the matching currency source.
          if (currency === 'doros') {
            spendDoros(price);
          } else {
            const ok = await window.Diamonds?.spendDiamond?.(price);
            if (!ok) {
              setBusy(false);
              showNotification('Not enough Diamonds', 'error');
              return;
            }
          }
          await purchaseItem(it.sku);

          setBusy(false);
          showNotification(`Purchased ${it.name}!`, 'success');
          // Refresh store-side balances immediately after successful purchase.
          paintStoreBalances();

        } catch (error) {
          setBusy(false);
          showNotification(`Failed to buy ${it.name}`, 'error');
          console.error('Purchase error:', error);
          // Refund the same currency if purchase API fails after local spend.
          if (currency === 'doros') {
            spendDoros(-price); // refund
          } else {
            await window.Diamonds?.addDiamond?.(price); // refund
          }
          paintStoreBalances();
        }
      });

      card.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        selectedSku = (selectedSku === it.sku) ? null : it.sku;
        highlightSelection();
      });

      grid.appendChild(card);
    });

    highlightSelection();
  }

  function highlightSelection() {
    const cards = Array.from(grid.querySelectorAll('.card'));
    cards.forEach(c => {
      const active = c.dataset.sku === selectedSku;
      c.style.outline = active ? '3px solid #2b2213' : 'none';
      c.style.outlineOffset = active ? '2px' : '0';
    });
  }

  function emitOpenSkins() {
    const evt = new CustomEvent('store:openSkins');
    window.dispatchEvent(evt);
  }

  return { openStore };
}

