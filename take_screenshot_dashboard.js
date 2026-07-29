const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = '/home/suyash/.gemini/antigravity-ide/brain/ea63754a-d3df-4169-8a64-cefc99d1674f';

  await page.goto('http://localhost:2000/', { waitUntil: 'networkidle' });
  
  // Click on System Admin login button
  await page.click('text=Login as System Admin');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_dashboard.png'), fullPage: true });
  console.log('Saved screenshot_dashboard.png');

  // Navigate to AI Forecasting if available or check UI
  const tabForecast = await page.$('text=AI Forecasting');
  if (tabForecast) {
    await tabForecast.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_forecasting.png'), fullPage: true });
    console.log('Saved screenshot_forecasting.png');
  }

  await browser.close();
})();
