const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function run() {
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
    defaultViewport: { width: 1440, height: 900 },
    executablePath: executablePath,
    headless: true
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pre-seed localStorage to dismiss onboarding
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('tiny-gods-onboarding-v1', 'dismissed');
  });

  console.log('Navigating to http://127.0.0.1:5001/...');
  await page.goto('http://127.0.0.1:5001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. World overview
  await page.screenshot({ path: 'docs/3d-proof/before/01-world.png' });
  console.log('Captured 01-world.png');

  // 2. Settlement
  await page.evaluate(() => {
    if (worldData && worldData.settlements && worldData.settlements.length > 0) {
      const s = worldData.settlements[0];
      cameraOffset.x = (WORLD_WIDTH / 2 - s.x) * 1.5;
      cameraOffset.y = (WORLD_HEIGHT / 2 - s.y) * 1.5;
      cameraZoom = 1.8;
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'docs/3d-proof/before/02-settlement.png' });
  console.log('Captured 02-settlement.png');

  // 3. Creature inspection modal
  await page.evaluate(async () => {
    if (worldData && worldData.creatures && worldData.creatures.length > 0) {
      const c = worldData.creatures[0];
      await openCreatureModal(c.id);
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'docs/3d-proof/before/03-creature.png' });
  console.log('Captured 03-creature.png');

  // Close modal
  await page.evaluate(() => {
    const modal = document.getElementById('creature-modal');
    if (modal) modal.style.display = 'none';
    cameraOffset = { x: 0, y: 0 };
    cameraZoom = 1.0;
  });

  // 4. Divine power action
  await page.evaluate(async () => {
    // Select a power like rain or wind
    selectedPower = 'rain';
    // Send action at 600, 450
    await sendAction('rain', 600, 450);
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'docs/3d-proof/before/04-divine-power.png' });
  console.log('Captured 04-divine-power.png');

  await browser.close();
  console.log('All BEFORE screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error during before capture:', err);
  process.exit(1);
});
