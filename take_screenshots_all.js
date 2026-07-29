const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = '/home/suyash/.gemini/antigravity-ide/brain/ea63754a-d3df-4169-8a64-cefc99d1674f';

  await page.goto('http://localhost:2000/', { waitUntil: 'networkidle' });
  await page.click('text=Login as System Admin');
  await page.waitForTimeout(1000);

  const tabs = [
    { name: 'Traffic Forecasting', screenshot: 'screenshot_forecasting.png' },
    { name: 'Route Optimizer', screenshot: 'screenshot_route_optimizer.png' },
    { name: 'Incident Control', screenshot: 'screenshot_incident_control.png' },
    { name: 'Analytics', screenshot: 'screenshot_analytics.png' }
  ];

  for (const tab of tabs) {
    const el = await page.$(`text="${tab.name}"`);
    if (el) {
      await el.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, tab.screenshot), fullPage: true });
      console.log(`Saved ${tab.screenshot}`);
    }
  }

  await browser.close();
})();
