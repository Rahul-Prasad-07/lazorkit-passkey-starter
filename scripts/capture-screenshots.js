const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.env.E2E_BASE_URL || 'http://localhost:3000';
  if (!fs.existsSync('docs/screenshots')) fs.mkdirSync('docs/screenshots', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true });
  console.log('Saved docs/screenshots/home.png');
  await browser.close();
})();