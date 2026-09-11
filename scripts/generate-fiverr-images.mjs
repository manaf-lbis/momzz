import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require('C:/Users/login/AppData/Roaming/npm/node_modules/goldie/node_modules/@napi-rs/canvas');
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('out', 'fiverr');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BEZEL_PATH = 'C:\\Users\\login\\AppData\\Roaming\\npm\\node_modules\\goldie\\assets\\17-pro-silver.png';
const RAW_DIR = path.resolve('out', 'raw', 'iphone-6.9');

// iPhone 17 Pro Bezel geometry from Goldie
const FRAME = {
  width: 606,
  height: 1252,
  screen: { x: 24, y: 21, width: 557, height: 1210 },
  screenRadius: 82
};

// Helper to draw framed phone
async function drawFramedPhone(ctx, shotImage, bezelImage, x, y, width, height, rotateDeg = 0) {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (rotateDeg !== 0) {
    ctx.rotate((rotateDeg * Math.PI) / 180);
  }
  ctx.translate(-width / 2, -height / 2);

  // Outer shadow for realistic 3D depth
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 20;
  ctx.shadowOffsetX = 0;
  ctx.fillStyle = '#050B17';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, (FRAME.screenRadius / FRAME.width) * width);
  ctx.fill();
  ctx.restore();

  // Screen cutout clip
  const sx = (FRAME.screen.x / FRAME.width) * width;
  const sy = (FRAME.screen.y / FRAME.height) * height;
  const sw = (FRAME.screen.width / FRAME.width) * width;
  const sh = (FRAME.screen.height / FRAME.height) * height;
  const sRadius = (FRAME.screenRadius / FRAME.width) * width;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, sRadius);
  ctx.clip();

  // Draw screenshot with cover scaling
  const scale = Math.max(sw / shotImage.width, sh / shotImage.height);
  const dw = shotImage.width * scale;
  const dh = shotImage.height * scale;
  ctx.drawImage(shotImage, sx + (sw - dw) / 2, sy + (sh - dh) / 2, dw, dh);
  ctx.restore();

  // Draw bezel over screen
  ctx.drawImage(bezelImage, 0, 0, width, height);
  ctx.restore();
}

// Draw a glowing pill badge
function drawBadge(ctx, text, x, y, bgGradient, textColor = '#FFFFFF') {
  ctx.save();
  ctx.font = 'bold 15px sans-serif';
  const paddingH = 16;
  const paddingV = 9;
  const metrics = ctx.measureText(text);
  const w = metrics.width + paddingH * 2;
  const h = 34;

  ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 17);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = textColor;
  ctx.fillText(text, x + paddingH, y + 22);
  ctx.restore();
  return w;
}

// Draw background lighting gradient
function drawBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#060B18');
  bg.addColorStop(0.5, '#0B152C');
  bg.addColorStop(1, '#050914');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Soft ambient amber glow top-right
  const amberGlow = ctx.createRadialGradient(w * 0.85, h * 0.15, 10, w * 0.85, h * 0.15, 450);
  amberGlow.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
  amberGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = amberGlow;
  ctx.fillRect(0, 0, w, h);

  // Soft ambient blue glow bottom-left
  const blueGlow = ctx.createRadialGradient(w * 0.15, h * 0.85, 10, w * 0.15, h * 0.85, 450);
  blueGlow.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
  blueGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = blueGlow;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid/dots for tech aesthetic
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let x = 40; x < w; x += 40) {
    for (let y = 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

async function generateFiverrImages() {
  console.log('Loading bezel and screenshots...');
  const bezel = await loadImage(BEZEL_PATH);
  const shotDashboard = await loadImage(path.join(RAW_DIR, 'dashboard.png'));
  const shotJobDetail = await loadImage(path.join(RAW_DIR, 'job-detail.png'));
  const shotPhotoStudio = await loadImage(path.join(RAW_DIR, 'photo-studio.png'));
  const shotInventory = await loadImage(path.join(RAW_DIR, 'inventory.png'));
  const shotLeaderboard = await loadImage(path.join(RAW_DIR, 'leaderboard.png'));

  // Standard Fiverr Gig Image Size: 1280 x 769 (or 2560 x 1538 for 2x HD)
  const SIZES = [
    { name: '1280x769', w: 1280, h: 769, scale: 1 },
    { name: '2560x1538', w: 2560, h: 1538, scale: 2 }
  ];

  for (const sz of SIZES) {
    const W = sz.w;
    const H = sz.h;
    const S = sz.scale;

    // ─────────────────────────────────────────────────────────────
    // GIG IMAGE 1: MAIN COVER / HERO SHOWCASE
    // ─────────────────────────────────────────────────────────────
    {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext('2d');
      drawBackground(ctx, W, H);

      // Left Column: High-Impact Typography & Highlights
      // Brand tag
      ctx.fillStyle = '#F59E0B';
      ctx.font = `900 ${14 * S}px sans-serif`;
      ctx.fillText("MOMZ'Z • FULL-STACK AUTOMOTIVE PLATFORM", 55 * S, 80 * S);

      // Main Headline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${36 * S}px sans-serif`;
      ctx.fillText('AUTO GARAGE & WORKSHOP', 55 * S, 130 * S);
      ctx.fillText('MANAGEMENT SYSTEM', 55 * S, 175 * S);

      // Subhead
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 ${17 * S}px sans-serif`;
      ctx.fillText('Modern MERN Stack Web App & PWA with real-time', 55 * S, 215 * S);
      ctx.fillText('job cards, technician dispatch & live socket updates.', 55 * S, 240 * S);

      // Key Features bullet list with custom clean badges
      const bullets = [
        'Live Workshop Job Cards & Dual Pinning (All / Me)',
        'Interactive Service Checklist & Milestones',
        'Dedicated Vehicle Photo Studio with Live Crop',
        'Technician Leaderboard & Shared Work Gamification',
        'Real-time Inventory, Spares Tracking & Invoicing'
      ];

      ctx.font = `600 ${14 * S}px sans-serif`;
      let bY = 290 * S;
      for (const b of bullets) {
        // glowing diamond bullet
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(60 * S, bY - 4 * S, 4 * S, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(b, 75 * S, bY);
        bY += 32 * S;
      }

      // Tech Stack Pill Badges at bottom left
      let tagX = 55 * S;
      const tagY = 475 * S;
      const techTags = ['React 18', 'TypeScript', 'Node / Express', 'MongoDB', 'Socket.IO', 'Tailwind'];
      for (const t of techTags) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1 * S;
        ctx.font = `bold ${12 * S}px sans-serif`;
        const tw = ctx.measureText(t).width + 20 * S;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tw, 28 * S, 14 * S);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(t, tagX + 10 * S, tagY + 18 * S);
        tagX += tw + 10 * S;
      }

      // Right Column: 3 Layered / Angled Phones
      // Phone 1 (Back Left - Photo Studio): tilted -6 deg
      const phoneW = 225 * S;
      const phoneH = (phoneW * FRAME.height) / FRAME.width;
      await drawFramedPhone(ctx, shotPhotoStudio, bezel, 650 * S, 130 * S, phoneW, phoneH, -8);

      // Phone 2 (Back Right - Leaderboard): tilted +8 deg
      await drawFramedPhone(ctx, shotLeaderboard, bezel, 970 * S, 150 * S, phoneW, phoneH, 9);

      // Phone 3 (Center Hero - Dashboard): front & elevated
      const heroW = 255 * S;
      const heroH = (heroW * FRAME.height) / FRAME.width;
      await drawFramedPhone(ctx, shotDashboard, bezel, 790 * S, 75 * S, heroW, heroH, 0);

      // Floating Feature Floating Card on the bottom right
      ctx.save();
      const cardX = 640 * S;
      const cardY = 665 * S;
      const cardW = 580 * S;
      const cardH = 65 * S;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 16 * S);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = `bold ${14 * S}px sans-serif`;
      ctx.fillText('100% Production Ready • Clean Architecture • Docker & Cloudinary', cardX + 25 * S, cardY + 38 * S);
      ctx.restore();

      const outPath = path.join(OUT_DIR, `fiverr-01-cover-${sz.name}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
      console.log(`Saved: ${outPath}`);
    }

    // ─────────────────────────────────────────────────────────────
    // GIG IMAGE 2: JOB CARDS & INTERACTIVE SERVICE CHECKLIST
    // ─────────────────────────────────────────────────────────────
    {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext('2d');
      drawBackground(ctx, W, H);

      // Header Tag
      ctx.fillStyle = '#F59E0B';
      ctx.font = `900 ${14 * S}px sans-serif`;
      ctx.fillText('FEATURE SPOTLIGHT • VEHICLE SERVICE FLOW', 55 * S, 75 * S);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${34 * S}px sans-serif`;
      ctx.fillText('SMART JOB CARDS & LIVE CHECKLIST', 55 * S, 125 * S);

      // Two Large Phones Side-by-Side: Dashboard & Job Detail
      const pW = 270 * S;
      const pH = (pW * FRAME.height) / FRAME.width;
      await drawFramedPhone(ctx, shotDashboard, bezel, 70 * S, 160 * S, pW, pH, -3);
      await drawFramedPhone(ctx, shotJobDetail, bezel, 380 * S, 140 * S, pW, pH, 3);

      // Right Side: Feature Highlights Panels
      const panelX = 690 * S;
      const panelW = 535 * S;
      let pY = 160 * S;

      const highlights = [
        {
          title: 'Dual Workshop & Personal Pinning',
          desc: '1-tap optimistic pinning keeps critical repairs at the top for everyone or in your personal queue with instant socket feedback.'
        },
        {
          title: 'Automated Garage Duration & Status',
          desc: 'Dynamic garage stay calculation (e.g. 17d 23h), ready-for-delivery indicators, and color-coded status pills.'
        },
        {
          title: 'Shared Work & Point Distribution',
          desc: 'Assign multiple mechanics to heavy repair tasks. Automatically distributes points and logs work audits.'
        },
        {
          title: '1-Tap Customer Contact & Details',
          desc: 'Collapsible service advisor card with quick-action direct calling and emailing buttons.'
        }
      ];

      for (const h of highlights) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 * S;
        ctx.beginPath();
        ctx.roundRect(panelX, pY, panelW, 115 * S, 16 * S);
        ctx.fill();
        ctx.stroke();

        // Bullet pip
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(panelX + 22 * S, pY + 28 * S, 5 * S, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FBBF24';
        ctx.font = `bold ${16 * S}px sans-serif`;
        ctx.fillText(h.title, panelX + 38 * S, pY + 34 * S);

        ctx.fillStyle = '#94A3B8';
        ctx.font = `500 ${13 * S}px sans-serif`;
        const words = h.desc.split(' ');
        let line = '';
        let lineY = pY + 62 * S;
        for (const word of words) {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > panelW - 44 * S) {
            ctx.fillText(line, panelX + 22 * S, lineY);
            line = word + ' ';
            lineY += 20 * S;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, panelX + 22 * S, lineY);
        ctx.restore();

        pY += 130 * S;
      }

      const outPath = path.join(OUT_DIR, `fiverr-02-job-tracking-${sz.name}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
      console.log(`Saved: ${outPath}`);
    }

    // ─────────────────────────────────────────────────────────────
    // GIG IMAGE 3: COMPLETE WORKSHOP ECOSYSTEM (PHOTO STUDIO + INVENTORY + LEADERBOARD)
    // ─────────────────────────────────────────────────────────────
    {
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext('2d');
      drawBackground(ctx, W, H);

      ctx.fillStyle = '#F59E0B';
      ctx.font = `900 ${14 * S}px sans-serif`;
      ctx.fillText('COMPLETE WORKSHOP SUITE • ALL-IN-ONE SOLUTION', 55 * S, 75 * S);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${34 * S}px sans-serif`;
      ctx.fillText('PHOTO STUDIO, SPARES & LEADERBOARD', 55 * S, 125 * S);

      // Three phones showcasing the remaining 3 powerful features
      const fW = 240 * S;
      const fH = (fW * FRAME.height) / FRAME.width;

      // Phone 1: Photo Studio
      await drawFramedPhone(ctx, shotPhotoStudio, bezel, 65 * S, 160 * S, fW, fH, 0);
      ctx.fillStyle = '#F59E0B';
      ctx.font = `bold ${16 * S}px sans-serif`;
      ctx.fillText('Vehicle Photo Studio', 95 * S, 715 * S);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 ${12 * S}px sans-serif`;
      ctx.fillText('Crop, flip, rotate & live card preview', 65 * S, 735 * S);

      // Phone 2: Inventory & Spares
      await drawFramedPhone(ctx, shotInventory, bezel, 520 * S, 160 * S, fW, fH, 0);
      ctx.fillStyle = '#F59E0B';
      ctx.font = `bold ${16 * S}px sans-serif`;
      ctx.fillText('Parts & Inventory', 565 * S, 715 * S);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 ${12 * S}px sans-serif`;
      ctx.fillText('Real-time stock alerts & pricing', 535 * S, 735 * S);

      // Phone 3: Leaderboard
      await drawFramedPhone(ctx, shotLeaderboard, bezel, 975 * S, 160 * S, fW, fH, 0);
      ctx.fillStyle = '#F59E0B';
      ctx.font = `bold ${16 * S}px sans-serif`;
      ctx.fillText('Mechanic Leaderboard', 1005 * S, 715 * S);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 ${12 * S}px sans-serif`;
      ctx.fillText('Trophies, performance & gamification', 975 * S, 735 * S);

      const outPath = path.join(OUT_DIR, `fiverr-03-ecosystem-${sz.name}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
      console.log(`Saved: ${outPath}`);
    }
  }

  console.log('All Fiverr Gig Images generated successfully!');
}

generateFiverrImages().catch(console.error);
