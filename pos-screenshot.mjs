/**
 * pos-screenshot.mjs
 * Takes a screenshot with a specific skin and background for positioning work.
 *
 * Usage:
 *   node pos-screenshot.mjs <skin> <bgKey>
 *
 * skin examples : default | Robot | Alien | Vampire | Bigfoot | Axolotyl |
 *                 Capybara | Frog | PrayingMantis | RockCreature | Butterfly |
 *                 Werewolf | DragonSkin
 * bgKey examples: Forest | Beach | African | Arctic | Cemetery | Desert |
 *                 Everglades | Floating Island | Inca | Japanese | Jungle |
 *                 Mayan | Mountain | Rainforest | Inner Earth | Moon | Mars
 *
 * Examples:
 *   node pos-screenshot.mjs default Forest
 *   node pos-screenshot.mjs Robot Beach
 *   node pos-screenshot.mjs Alien "Floating Island"
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/seste/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer-core/lib/cjs/puppeteer/puppeteer-core.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROME = 'C:/Users/seste/AppData/Local/Google/Chrome/Application/chrome.exe';
const BASE_URL = 'http://localhost:9090/public/index.html';

const skin  = process.argv[2] || 'default';
const bgKey = process.argv[3] || 'Forest';

// Map background key → day image filename (must match BACKGROUNDS array in store.js)
const BG_FILES = {
  'Forest':         null,   // default — let backgroundnight.js handle it
  'African':        'AfricanBackgroundDay.png',
  'Arctic':         'ArcticBackgroundDay.png',
  'Beach':          'BeachBackgroundDay.png',
  'Cemetery':       'CemeteryBackgroundDay.png',
  'Desert':         'DesertBackgroundDay.png',
  'Everglades':     'EvergladesBackgroundDay.png',
  'Floating Island':'FloatingIslandBackgroundDay.png',
  'Inca':           'IncaBackgroundDay.png',
  'Japanese':       'JapaneseBackgroundDay.png',
  'Jungle':         'JungleBackgroundDay.png',
  'Mayan':          'MayanBackgroundDay.png',
  'Mountain':       'MountainBackgroundDay.png',
  'Rainforest':     'RainforestBackgroundDay.png',
  'Inner Earth':    'InnerEarthBackground.png',
  'Moon':           'MoonBackground.png',
  'Mars':           'MarsBackgroundDay.png',
};

// Map skin name → open-eyes asset path (relative to ASSET_BASE)
const SKIN_FILES = {
  'default':       null,   // use Dragon.png (no override)
  'DragonSkin':    'Skins/DragonSkin.png',
  'Alien':         'Skins/Alien.png',
  'Axolotyl':      'Skins/Axolotyl.png',
  'Bigfoot':       'Skins/Bigfoot.png',
  'Butterfly':     'Skins/Butterfly.png',
  'Capybara':      'Skins/Capybara.png',
  'Frog':          'Skins/Frog.png',
  'PrayingMantis': 'Skins/PrayingMantis.png',
  'Robot':         'Skins/Robot.png',
  'RockCreature':  'Skins/RockCreature.png',
  'Vampire':       'Skins/Vampire.png',
  'Werewolf':      'Skins/Werewolf.png',
};

const bgFile  = BG_FILES[bgKey];
const skinFile = SKIN_FILES[skin];

if (!(bgKey in BG_FILES))  { console.error('Unknown background:', bgKey);  process.exit(1); }
if (!(skin  in SKIN_FILES)) { console.error('Unknown skin:', skin);          process.exit(1); }

// Auto-increment screenshot filename
const dir = path.join(__dirname, 'temporary screenshots');
fs.mkdirSync(dir, { recursive: true });
const existing = fs.readdirSync(dir).filter(f => f.match(/^pos-\d+/));
const nums = existing.map(f => parseInt(f.match(/^pos-(\d+)/)?.[1] || '0')).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;
const label = `${skin}-${bgKey.replace(/ /g, '')}`;
const outPath = path.join(dir, `pos-${next}-${label}.png`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Inject localStorage BEFORE the page JS runs
await page.evaluateOnNewDocument((bgKey, bgFile, skinFile) => {
  // Bypass auth + onboarding
  localStorage.setItem('authToken', 'test-token-for-screenshots');
  localStorage.setItem('hasSeenOnboarding', 'true');

  // Set skin
  if (skinFile) {
    localStorage.setItem('buddydoro.skin.open',   skinFile);
    localStorage.setItem('buddydoro.skin.closed',  skinFile);
  } else {
    localStorage.removeItem('buddydoro.skin.open');
    localStorage.removeItem('buddydoro.skin.closed');
  }

  // Set background
  if (bgFile) {
    localStorage.setItem('buddydoro:selectedBackground', bgKey);
  } else {
    localStorage.removeItem('buddydoro:selectedBackground');
  }
}, bgKey, bgFile, skinFile);

await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 2000));

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log('Saved:', outPath);
