const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Set viewport width to 480px to reproduce mobile layout overlap in screenshot
  const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
  const artifactDir = '/home/suyash/.gemini/antigravity-ide/brain/ea63754a-d3df-4169-8a64-cefc99d1674f';

  await page.goto('http://localhost:2000/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_mobile_before.png'), fullPage: false });
  console.log('Saved screenshot_mobile_before.png');

  await browser.close();
})();
