const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const artifactDir = '/home/suyash/.gemini/antigravity-ide/brain/ea63754a-d3df-4169-8a64-cefc99d1674f';
  
  try {
    await page.goto('http://localhost:2000/', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log('Navigation timed out, continuing anyway');
  }
  
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home.png'), fullPage: true });
  console.log('Saved screenshot_home.png');
  
  await browser.close();
})();
