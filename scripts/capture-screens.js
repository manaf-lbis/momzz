import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_BASE = path.resolve('out', 'raw');

// Admin user payload from MongoDB
const user = {
  _id: '6a6ab77ed3f036011e5b8210',
  id: '6a6ab77ed3f036011e5b8210',
  name: 'Abdul Manaf s',
  mobile: '7994414155',
  role: 'ADMIN',
  isApproved: true,
  profileImageUrl: 'momzz/profiles/av3zzfy8yjz18szn60jb'
};

const token = jwt.sign(
  { id: user.id, mobile: user.mobile, role: user.role, name: user.name },
  'momzz_jwt_access_secret_key_15m_2026',
  { expiresIn: '7d' }
);

const scenes = [
  {
    id: 'dashboard',
    path: '/jobs',
    title: 'Live Workshop Dashboard'
  },
  {
    id: 'job-detail',
    path: '/jobs/6a6ec207a342db8610a3371a',
    title: 'Job Card & Service Checklist'
  },
  {
    id: 'photo-studio',
    path: '/jobs/6a6ec207a342db8610a3371a/photo',
    title: 'Vehicle Photo Studio & Crop'
  },
  {
    id: 'inventory',
    path: '/inventory',
    title: 'Inventory & Parts Management'
  },
  {
    id: 'leaderboard',
    path: '/leaderboard',
    title: 'Technician Leaderboard & Points'
  }
];

const devices = [
  {
    key: 'iphone-6.9',
    viewport: {
      width: 440,
      height: 956,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    }
  },
  {
    key: 'pixel-10-pro',
    viewport: {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true
    }
  }
];

async function capture() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars'
    ]
  });

  try {
    for (const dev of devices) {
      console.log(`\nCapturing scenes for device: ${dev.key}`);
      const devDir = path.join(OUT_BASE, dev.key);
      fs.mkdirSync(devDir, { recursive: true });

      const page = await browser.newPage();
      await page.setViewport(dev.viewport);

      // Pre-seed localStorage before navigating
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((authData) => {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        localStorage.setItem('garagehub_theme', 'dark');
        document.documentElement.classList.add('dark');
      }, { token, user });

      const capturedScreenshots = [];

      for (const scene of scenes) {
        console.log(`  -> Capturing scene "${scene.id}" (${scene.path})...`);
        const targetUrl = `${BASE_URL}${scene.path}`;
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        });

        // Ensure dark mode is active and let animations settle
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
        });
        await new Promise((r) => setTimeout(r, 2000));

        const filePath = path.join(devDir, `${scene.id}.png`);
        await page.screenshot({ path: filePath, type: 'png' });
        console.log(`     Saved to: ${filePath}`);

        capturedScreenshots.push({
          sceneId: scene.id,
          file: filePath
        });
      }

      // Write manifest.json that goldie frame expects
      const manifest = {
        device: dev.key,
        udid: 'manual-capture',
        capturedAt: new Date().toISOString(),
        screenshots: capturedScreenshots,
        preview: null
      };

      const manifestPath = path.join(devDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`  -> Wrote manifest to: ${manifestPath}`);

      await page.close();
    }
  } finally {
    await browser.close();
    console.log('\nBrowser closed. Capture finished successfully!');
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
