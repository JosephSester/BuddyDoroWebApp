// Puppeteer screenshot helper
// Usage: node screenshot.mjs <url> [label]
// Example: node screenshot.mjs http://localhost:3000
//          node screenshot.mjs http://localhost:3000 dark-mode
// Saves to: ./temporary screenshots/screenshot-N.png (or screenshot-N-label.png)

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Auto-increment: find next available N
const existing = fs.readdirSync(outDir)
  .map(f => {
    const m = f.match(/^screenshot-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
const next = existing.length ? Math.max(...existing) + 1 : 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;
const outPath = path.join(outDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
} catch (e) {
  console.warn('Navigation warning:', e.message);
}

// Small wait for animations/fonts to settle
await new Promise(r => setTimeout(r, 500));

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
