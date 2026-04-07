import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/seste/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer-core/lib/cjs/puppeteer/puppeteer-core.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url        = process.argv[2] || 'http://localhost:9090';
const label      = process.argv[3] || '';
const slideIndex = parseInt(process.argv[4] || '0', 10);

// Auto-increment screenshot filename
const dir = path.join(__dirname, 'temporary screenshots');
fs.mkdirSync(dir, { recursive: true });
const existing = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(dir, filename);

const CHROME = 'C:/Users/seste/AppData/Local/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
// Wait for page JS to initialize
await new Promise(r => setTimeout(r, 2500));

// Navigate to the desired slide using keyboard (ArrowDown)
if (slideIndex > 0) {
  await page.focus('body');
  for (let i = 0; i < slideIndex; i++) {
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 2000));
  }
}

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log('Saved:', outPath);
