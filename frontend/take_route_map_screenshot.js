import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = '/home/suyash/.gemini/antigravity-cli/brain/05eee74b-2df5-45c9-a937-d174ccbb1357';

  try {
    console.log('Navigating to Login Page for demo access...');
    await page.goto('http://localhost:2000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('Clicking ADMIN Demo Login...');
    const adminBtn = await page.$('button:has-text("ADMIN")');
    if (adminBtn) {
      await adminBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('Clicking Route Optimizer Tab...');
    const routeTab = await page.$('button:has-text("Route Optimizer")');
    if (routeTab) {
      await routeTab.click();
      await page.waitForTimeout(3000);
      
      const routeMapPath = path.join(artifactDir, 'ui_route_map_gps_pins.png');
      await page.screenshot({ path: routeMapPath, fullPage: true });
      console.log(`Saved Route Map screenshot to ${routeMapPath}`);
    }

  } catch (err) {
    console.error('Error during Playwright Route Map test:', err);
  } finally {
    await browser.close();
  }
})();
