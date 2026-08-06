import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = '/home/suyash/.gemini/antigravity-cli/brain/05eee74b-2df5-45c9-a937-d174ccbb1357';

  try {
    // 1. Landing Page Screenshot
    console.log('Navigating to Landing Page...');
    await page.goto('http://localhost:2000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const landingPath = path.join(artifactDir, 'ui_landing_page.png');
    await page.screenshot({ path: landingPath, fullPage: true });
    console.log(`Saved Landing Page screenshot to ${landingPath}`);

    // 2. Login Page Screenshot
    console.log('Navigating to Login Page...');
    await page.goto('http://localhost:2000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const loginPath = path.join(artifactDir, 'ui_login_page.png');
    await page.screenshot({ path: loginPath, fullPage: true });
    console.log(`Saved Login Page screenshot to ${loginPath}`);

    // 3. Quick Demo Login to Dashboard Screenshot
    console.log('Performing Demo Admin Login...');
    const adminBtn = await page.$('button:has-text("ADMIN")');
    if (adminBtn) {
      await adminBtn.click();
      await page.waitForTimeout(2000);
      const dashPath = path.join(artifactDir, 'ui_dashboard.png');
      await page.screenshot({ path: dashPath, fullPage: true });
      console.log(`Saved Dashboard screenshot to ${dashPath}`);
    }

  } catch (err) {
    console.error('Error during Playwright UI test:', err);
  } finally {
    await browser.close();
  }
})();
