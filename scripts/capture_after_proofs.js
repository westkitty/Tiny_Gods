const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function captureAll() {
  const outDir = path.resolve(__dirname, '../docs/3d-proof/after');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader'
    ],
    defaultViewport: { width: 1440, height: 900 },
    executablePath: executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('tiny-gods-onboarding-v1', 'dismissed');
    });

    console.log('Navigating to http://127.0.0.1:5001/ ...');
    await page.goto('http://127.0.0.1:5001/', { waitUntil: 'domcontentloaded' });

    console.log('Waiting for 3D world diorama to initialize and populate...');
    await page.waitForFunction(() => {
      return window.__scene &&
             window.__scene.children.some(c => c.userData?.type === 'ground') &&
             document.getElementById('tick-val')?.textContent !== '0';
    }, { timeout: 35000 });

    await new Promise(r => setTimeout(r, 1200));

    const world = await page.evaluate(() => window.getWorldData ? window.getWorldData() : null);
    const settlements = Object.values(world?.settlements || {});
    const creatures = Object.values(world?.creatures || {}).filter(c => c.alive);
    console.log(`World ready: ${settlements.length} settlements, ${creatures.length} creatures.`);

    // 1. World Perspective Desktop
    if (!fs.existsSync(path.join(outDir, '01-world-perspective-desktop.png'))) {
      console.log('Capturing 01-world-perspective-desktop.png ...');
      await page.evaluate(() => {
        window.centerCameraOn(600, 450);
        window.setCameraZoom(1.05);
        window.setAtmosphere('day');
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, '01-world-perspective-desktop.png') });
    }

    // 2. Physical Settlement Cluster
    if (!fs.existsSync(path.join(outDir, '02-physical-settlement-cluster.png'))) {
      console.log('Capturing 02-physical-settlement-cluster.png ...');
      const targetSettlement = settlements[0] || { x: 400, y: 350 };
      await page.evaluate((sx, sy) => {
        window.centerCameraOn(sx, sy);
        window.setCameraZoom(2.5);
      }, targetSettlement.x, targetSettlement.y);
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, '02-physical-settlement-cluster.png') });
    }

    // 3. Humanoid Creatures with Roles & Equipment
    if (!fs.existsSync(path.join(outDir, '03-humanoid-creatures-roles.png'))) {
      console.log('Capturing 03-humanoid-creatures-roles.png ...');
      const targetCreature = creatures.find(c => c.occupation && c.occupation !== 'wanderer') || creatures[0] || { x: 500, y: 400 };
      await page.evaluate((cx, cy) => {
        window.centerCameraOn(cx, cy);
        window.setCameraZoom(3.6);
      }, targetCreature.x, targetCreature.y);
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, '03-humanoid-creatures-roles.png') });
    }

    // 4. Divine Power 3D VFX (Lightning bolt / Divine fire)
    if (!fs.existsSync(path.join(outDir, '04-divine-power-3d-vfx.png'))) {
      console.log('Capturing 04-divine-power-3d-vfx.png ...');
      const targetSettlement = settlements[0] || { x: 400, y: 350 };
      await page.evaluate((tx, ty) => {
        window.centerCameraOn(tx, ty);
        window.setCameraZoom(2.2);
        window.triggerPowerPresentation('lightning', tx, ty, 80);
      }, targetSettlement.x + 30, targetSettlement.y + 20);
      await new Promise(r => setTimeout(r, 80));
      await page.screenshot({ path: path.join(outDir, '04-divine-power-3d-vfx.png') });
    }

    // 5. Night or Atmospheric Weather
    if (!fs.existsSync(path.join(outDir, '05-night-or-atmospheric-weather.png'))) {
      console.log('Capturing 05-night-or-atmospheric-weather.png ...');
      await page.evaluate(() => {
        window.centerCameraOn(600, 450);
        window.setCameraZoom(1.2);
        window.setAtmosphere('night');
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, '05-night-or-atmospheric-weather.png') });
      await page.evaluate(() => window.setAtmosphere('day'));
    }

    // 6. Creature Inspection Raycast Modal
    if (!fs.existsSync(path.join(outDir, '06-creature-inspection-raycast.png'))) {
      console.log('Capturing 06-creature-inspection-raycast.png ...');
      const targetCreature = creatures.find(c => c.occupation && c.occupation !== 'wanderer') || creatures[0] || { x: 500, y: 400 };
      const inspectCid = targetCreature.id ?? Object.keys(world?.creatures || {})[0] ?? 1;
      await page.evaluate(async (cid) => {
        await window.openCreatureModal(cid);
      }, inspectCid);
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(outDir, '06-creature-inspection-raycast.png') });
      await page.evaluate(() => window.closeModal());
    }

    // 7. Sacred Site or Temple
    if (!fs.existsSync(path.join(outDir, '07-sacred-site-or-temple.png'))) {
      console.log('Capturing 07-sacred-site-or-temple.png ...');
      await page.evaluate(() => {
        window.centerCameraOn(600, 450);
        window.setCameraZoom(2.6);
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, '07-sacred-site-or-temple.png') });
    }

    // 8. Mobile Responsive 3D (390x844)
    if (!fs.existsSync(path.join(outDir, '08-mobile-responsive-3d.png'))) {
      console.log('Capturing 08-mobile-responsive-3d.png ...');
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
        window.centerCameraOn(600, 450);
        window.setCameraZoom(1.3);
      });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, '08-mobile-responsive-3d.png') });
    }

    // 9. HERO.png (1440x900)
    if (!fs.existsSync(path.join(outDir, 'HERO.png'))) {
      console.log('Capturing HERO.png ...');
      await page.setViewport({ width: 1440, height: 900 });
      await page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
        window.centerCameraOn(600, 450);
        window.setCameraZoom(1.15);
        window.setAtmosphere('day');
      });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, 'HERO.png') });
    }

    console.log('Finished capturing requested proofs!');
  } finally {
    try {
      const proc = browser.process();
      if (proc) proc.kill('SIGKILL');
    } catch {}
  }
}

captureAll().then(() => {
  console.log('Script done.');
  process.exit(0);
}).catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
