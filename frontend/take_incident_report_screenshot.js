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

    console.log('Clicking OPERATOR Demo Login...');
    const opBtn = await page.$('button:has-text("OPERATOR")');
    if (opBtn) {
      await opBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('Clicking Incident Control Tab...');
    const incidentTab = await page.$('button:has-text("Incident Control")');
    if (incidentTab) {
      await incidentTab.click();
      await page.waitForTimeout(2000);

      console.log('Clicking Log New Traffic Incident button...');
      const addBtn = await page.$('button:has-text("Log New Traffic Incident")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1500);
      }

      const routeMapPath = path.join(artifactDir, 'ui_incident_report_modal.png');
      await page.screenshot({ path: routeMapPath });
      console.log(`Saved Incident Modal screenshot to ${routeMapPath}`);
    }

  } catch (err) {
    console.error('Error during Playwright Incident Modal test:', err);
  } finally {
    await browser.close();
  }
})();
