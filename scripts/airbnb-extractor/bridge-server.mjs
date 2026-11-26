#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const configPath = path.join(__dirname, 'config.json');
const exampleConfigPath = path.join(__dirname, 'config.example.json');
const config = JSON.parse(
  fs.readFileSync(fs.existsSync(configPath) ? configPath : exampleConfigPath, 'utf8')
);

const PORT = Number(process.env.AIRBNB_BRIDGE_PORT || 4321);
const profileDir = path.join(os.homedir(), '.karuna-airbnb-profile');

const ALLOWED_ORIGINS = new Set([
  'https://admin.karunavillas.com',
  'https://www.admin.karunavillas.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Active job state
const job = {
  status: 'idle', // idle | waiting_login | scanning | done | error
  fromDate: '',
  toDate: '',
  currentMonth: '',
  progressText: '',
  logs: [],
  reservations: [],
  error: '',
};

let activeContext = null;
let loginContinueResolver = null;
let cancelRequested = false;

function addLog(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  job.logs.push(line);
  if (job.logs.length > 80) job.logs.shift();
}

function parseFlexibleDate(raw) {
  if (!raw) return '';
  let cleaned = String(raw)
    .trim()
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*/i, '')
    .replace(/\s+at\s+.*$/i, '')
    .replace(/\s+\d{1,2}:\d{2}.*$/i, '')
    .trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  if (!/\b20\d{2}\b/.test(cleaned)) {
    const now = new Date();
    const testDate = new Date(`${cleaned} ${now.getFullYear()}`);
    if (!Number.isNaN(testDate.getTime())) {
      const diffDays = (testDate.getTime() - now.getTime()) / 86400000;
      const year = diffDays < -60 ? now.getFullYear() + 1 : now.getFullYear();
      cleaned = `${cleaned} ${year}`;
    }
  }
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function getYearMonthsInRange(fromDate, toDate) {
  const [y1, m1] = fromDate.split('-').map(Number);
  const [y2, m2] = toDate.split('-').map(Number);
  const list = [];
  let y = y1;
  let m = m1;
  while (y < y2 || (y === y2 && m <= m2)) {
    list.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
    if (list.length >= 18) break;
  }
  return list.reverse();
}

function parseReservationPanelText(rawText, fallbackPillName = '', targetYear = new Date().getFullYear()) {
  const text = String(rawText || '').replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const findAfterLabel = (labelRegex) => {
    for (let i = 0; i < lines.length; i++) {
      if (labelRegex.test(lines[i])) {
        const rest = lines[i].replace(labelRegex, '').replace(/^[:\s-]+/, '').trim();
        if (rest) return rest;
        if (i + 1 < lines.length) return lines[i + 1];
      }
    }
    return '';
  };

  const codeMatch =
    text.match(/Confirmation\s*code[\s:\n]+([A-Z0-9]{8,14})/i) ||
    text.match(/\b(HM[A-Z0-9]{8})\b/);
  const confirmationCode = codeMatch ? codeMatch[1].toUpperCase() : '';

  const bookingDateRaw = findAfterLabel(/^Booking\s+date$/i);
  const bookingDateIso = parseFlexibleDate(bookingDateRaw);
  const yearMatch = bookingDateRaw.match(/\b(20\d{2})\b/);
  const refYear = yearMatch ? Number(yearMatch[1]) : targetYear;

  const parseWithRefYear = (raw) => {
    if (!raw) return '';
    if (/\b20\d{2}\b/.test(raw) || /^\d{4}-\d{2}-\d{2}/.test(raw)) return parseFlexibleDate(raw);
    const candidate = parseFlexibleDate(`${raw} ${refYear}`);
    if (candidate && bookingDateIso && candidate < bookingDateIso) {
      const nextYearCandidate = parseFlexibleDate(`${raw} ${refYear + 1}`);
      if (nextYearCandidate) return nextYearCandidate;
    }
    return candidate;
  };

  const checkInDate = parseWithRefYear(findAfterLabel(/^Check-?in$/i) || findAfterLabel(/^Check-?in\b/i));
  let checkOutDate = parseWithRefYear(findAfterLabel(/^Check-?out$/i) || findAfterLabel(/^Check-?out\b/i));
  if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
    const [y, m, d] = checkOutDate.split('-').map(Number);
    checkOutDate = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  let guestName = findAfterLabel(/^Who['’]s\s+coming$/i);
  if (!guestName || /^\+?\d|adult|guest/i.test(guestName)) {
    const groupLine = lines.find((l) => /['’]s\s+group\s+of\s+\d+/i.test(l));
    if (groupLine) guestName = groupLine.replace(/['’]s\s+group\s+of\s+\d+.*$/i, '').trim();
  }
  if (!guestName) {
    const skipLine = /^(?:\+\d+|\d+\s+others?|Past\s+guest|Confirmed|Completed|Checked\s+out|Cancelled|Check-?in|Check-?out|Booking\s+date|Confirmation\s+code|Cancellation\s+policy|Manage\s+reservation|Your\s+notes|Suggested\s+door\s+code|Total\s+for)/i;
    const dateLine = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\d{1,2}|^\d{1,2}[–-]\d{1,2}\s+[A-Za-z]|^\d{1,2}:\d{2}|^[₹$€£]/i;
    const topName = lines.slice(0, 6).find((l) => !skipLine.test(l) && !dateLine.test(l) && l.length >= 2 && l.length <= 36 && !/\d{4}/.test(l));
    if (topName) guestName = topName;
  }
  if (!guestName) {
    const cleanPill = String(fallbackPillName || '')
      .replace(/\b\d+\s*(?:adult|guest|night)s?\b/gi, '')
      .replace(/[₹$€£][\d,.]+/g, '')
      .replace(/^\+\d+\s*/, '')
      .replace(/\bUser\s+Profile\b|\bProfile\b/gi, '')
      .trim();
    if (cleanPill && cleanPill.length >= 2 && cleanPill.length <= 40 && !/^\d+$/.test(cleanPill)) {
      guestName = cleanPill;
    }
  }
  if (!guestName) guestName = confirmationCode ? `Airbnb Guest (${confirmationCode})` : 'Airbnb Guest';

  const whosComing =
    lines.find((l) => /^\d+\s+(?:adult|guest)s?(?:,\s*\d+\s+(?:child|children|infant|pet)s?)?$/i.test(l)) ||
    lines.find((l) => /group\s+of\s+\d+/i.test(l)) ||
    '';

  let totalAmount = 0;
  const earnLabelVal = findAfterLabel(/^You\s+earn$/i) || findAfterLabel(/^Your\s+earnings$/i);
  if (earnLabelVal && /\d/.test(earnLabelVal)) totalAmount = Number(String(earnLabelVal).replace(/[^0-9.]/g, '')) || 0;
  if (totalAmount === 0) {
    for (let i = 1; i < lines.length; i++) {
      if (/^Total\s+for\s+\d+\s+night/i.test(lines[i]) && /[₹$€£]\s*[\d,]+/.test(lines[i - 1])) {
        totalAmount = Number(lines[i - 1].replace(/[^0-9.]/g, '')) || 0;
        break;
      }
    }
  }
  if (totalAmount === 0) {
    const cancelIdx = lines.findIndex((l) => /^Cancellation\s+policy$/i.test(l));
    if (cancelIdx >= 0) {
      for (let i = cancelIdx + 1; i < Math.min(lines.length, cancelIdx + 6); i++) {
        if (/[₹$€£]\s*[\d,]+/.test(lines[i])) {
          totalAmount = Number(lines[i].replace(/[^0-9.]/g, '')) || 0;
          break;
        }
      }
    }
  }

  let phone = '';
  const phoneMatch = text.match(/(\+\d{1,3}[\s-]?\d{3,5}[\s-]?\d{3,6}[\s-]?\d{0,4})/);
  if (phoneMatch) phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
  else {
    const doorCode = findAfterLabel(/^Suggested\s+door\s+code$/i);
    if (/^\d{4}$/.test(doorCode)) phone = `****${doorCode}`;
  }

  const noteParts = [];
  if (whosComing) noteParts.push(`Guests: ${whosComing}`);
  if (confirmationCode) noteParts.push(`Code: ${confirmationCode}`);

  return {
    confirmationCode,
    guestName,
    phone,
    checkInDate,
    checkOutDate,
    whosComing,
    totalAmount,
    source: 'Airbnb',
    notes: noteParts.join(' | ') || 'Extracted from Airbnb Calendar',
  };
}

async function findTopLeftDateSelector(page) {
  const handles = await page.locator('button, [role="button"], select').elementHandles();
  const monthRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;
  let best = null;
  for (const el of handles) {
    try {
      const box = await el.boundingBox();
      if (!box || box.left > 520 || box.y < 40 || box.y > 250 || box.width < 40 || box.height < 18) continue;
      const text = (await el.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
      if (text.length >= 3 && text.length <= 32 && monthRe.test(text)) {
        if (!best || box.y < best.box.y || (Math.abs(box.y - best.box.y) < 15 && box.x < best.box.x)) {
          best = { el, box, text };
        }
      }
    } catch { /* ignore */ }
  }
  return best;
}

async function getVisibleCalendarMonthLabel(page) {
  const topLeft = await findTopLeftDateSelector(page);
  if (topLeft?.text) return topLeft.text;
  return page.evaluate(() => {
    const monthRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+20\d{2})?\b/i;
    const candidates = [];
    for (const el of document.querySelectorAll('h1, h2, h3, button, span, div')) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 40 || rect.top > 260 || rect.width === 0 || rect.height === 0) continue;
      if (el.children.length > 2) continue;
      const t = (el.innerText || '').trim();
      if (t.length >= 3 && t.length <= 28 && monthRe.test(t) && !/\d{1,2}\s*[–-]/.test(t)) {
        candidates.push({ text: t, top: rect.top, left: rect.left });
      }
    }
    candidates.sort((a, b) => a.top - b.top || a.left - b.left);
    return candidates[0]?.text || '(unknown)';
  }).catch(() => '(unknown)');
}

function parseMonthYearFromLabel(label, fallbackYear) {
  const m = String(label || '').match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(20\d{2}))?\b/i
  );
  if (!m) return null;
  const token = m[1].toLowerCase();
  let month = MONTH_NAMES.findIndex((x) => x.toLowerCase() === token);
  if (month <= 0) month = SHORT_MONTHS.findIndex((x) => x.toLowerCase() === token);
  const year = m[2] ? Number(m[2]) : fallbackYear;
  return month > 0 ? { year, month } : null;
}

async function scrollCalendarContainer(page, deltaY) {
  return page.evaluate((dy) => {
    const scrollables = Array.from(document.querySelectorAll('div, main, section'))
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 50 &&
          rect.left >= 250 &&
          rect.width > 350 &&
          rect.height > 250
        );
      })
      .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);

    const target = scrollables[0];
    if (target) {
      const before = target.scrollTop;
      target.scrollTop += dy;
      return { moved: target.scrollTop !== before };
    }
    const beforeW = window.scrollY;
    window.scrollBy(0, dy);
    return { moved: window.scrollY !== beforeW };
  }, deltaY);
}

async function navigateCalendarToMonth(page, year, month) {
  const targetFull = `${MONTH_NAMES[month]} ${year}`;
  const targetMonthName = MONTH_NAMES[month];
  const targetShort = SHORT_MONTHS[month];
  const isMatch = (label) => {
    const p = parseMonthYearFromLabel(label, year);
    return p && p.month === month && p.year === year;
  };

  let currentLabel = await getVisibleCalendarMonthLabel(page);
  if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };

  const jumped = await page.evaluate(({ full, shortName, y }) => {
    const nodes = Array.from(document.querySelectorAll('h1, h2, h3, div, span')).filter((el) => {
      if (el.children.length > 2) return false;
      const t = (el.innerText || '').trim();
      return t.toLowerCase() === full.toLowerCase() || t.toLowerCase() === `${shortName} ${y}`.toLowerCase();
    });
    if (nodes[0]) {
      nodes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  }, { full: targetFull, shortName: targetShort, y: year }).catch(() => false);

  if (jumped) {
    await page.waitForTimeout(1800);
    currentLabel = await getVisibleCalendarMonthLabel(page);
    if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
  }

  const curParsed = parseMonthYearFromLabel(currentLabel, new Date().getFullYear()) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const diffMonths = (year - curParsed.year) * 12 + (month - curParsed.month);
  const stepDelta = diffMonths < 0 ? -550 : 550;

  let stuckCount = 0;
  let lastSeenLabel = currentLabel;
  for (let attempt = 0; attempt < 20; attempt++) {
    if (cancelRequested) break;
    const res = await scrollCalendarContainer(page, stepDelta);
    if (!res.moved) {
      await page.mouse.move(520, 420);
      await page.mouse.wheel(0, stepDelta);
    }
    await page.waitForTimeout(1200);
    currentLabel = await getVisibleCalendarMonthLabel(page);
    if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
    if (!res.moved && currentLabel === lastSeenLabel) {
      stuckCount++;
      if (stuckCount >= 5) return { label: currentLabel, reachedBoundary: true };
    } else {
      stuckCount = 0;
      lastSeenLabel = currentLabel;
    }
  }
  return { label: currentLabel, reachedBoundary: false };
}

async function scanVisibleCalendar(page, reservationsByKey, clickedSignatures, targetYear) {
  const handles = await page.locator('button:has(img), [role="button"]:has(img)').elementHandles();
  let newlyFound = 0;

  for (const el of handles) {
    if (cancelRequested) break;
    try {
      const box = await el.boundingBox();
      if (!box || box.width < 20 || box.y < 115 || box.x < 40 || box.x > 900) continue;

      const isInsideGuestPanel = await el.evaluate((node) => {
        if (node.closest('aside, [role="dialog"], [role="complementary"]')) return true;
        let cur = node.parentElement;
        for (let d = 0; d < 6 && cur; d++) {
          const t = cur.innerText || '';
          if (t.length < 4000 && /Who['’]s\s+coming|Cancellation\s+policy|Manage\s+reservation/i.test(t)) return true;
          cur = cur.parentElement;
        }
        return false;
      }).catch(() => true);
      if (isInsideGuestPanel) continue;

      const sig = await el.evaluate((node) => {
        const img = node.querySelector('img');
        return `${(node.innerText || '').trim().slice(0, 40)}|${img?.getAttribute('alt') || ''}|${img?.getAttribute('src')?.slice(-24) || ''}`;
      }).catch(() => '');
      if (!sig || clickedSignatures.has(sig)) continue;
      clickedSignatures.add(sig);

      await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const panelText = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('aside, [role="dialog"], section, div')).filter((node) => {
          const t = node.innerText || '';
          return (
            t.length > 80 &&
            t.length < 5000 &&
            /Check-?in/i.test(t) &&
            /Check-?out/i.test(t) &&
            (/Cancellation\s+policy/i.test(t) || /Confirmation\s+code/i.test(t) || /Total\s+for/i.test(t))
          );
        });
        containers.sort((a, b) => (a.innerText?.length || 99999) - (b.innerText?.length || 99999));
        return containers[0]?.innerText || '';
      });
      if (!panelText) continue;

      const [pillText, pillAlt] = sig.split('|');
      const parsed = parseReservationPanelText(panelText, pillText || pillAlt || '', targetYear);
      if (!parsed.checkInDate || !parsed.checkOutDate) continue;

      const key = parsed.confirmationCode || `${parsed.checkInDate}_${parsed.checkOutDate}_${parsed.guestName}`;
      if (!reservationsByKey.has(key)) {
        reservationsByKey.set(key, parsed);
        newlyFound++;
        addLog(`📌 ${parsed.guestName} | ${parsed.checkInDate} → ${parsed.checkOutDate} | ₹${parsed.totalAmount}`);
      }
    } catch { /* ignore */ }
  }
  return newlyFound;
}

async function runExtractionJob(fromDate, toDate) {
  cancelRequested = false;
  job.status = 'waiting_login';
  job.fromDate = fromDate;
  job.toDate = toDate;
  job.currentMonth = '';
  job.progressText = 'Opening Chrome at Airbnb Calendar — sign in with Phone + OTP if prompted, then click "Start Scanning" in Admin.';
  job.logs = [];
  job.reservations = [];
  job.error = '';

  try {
    addLog(`Launching Chrome for range ${fromDate} → ${toDate}...`);
    activeContext = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1360, height: 860 },
    });

    const page = activeContext.pages()[0] || (await activeContext.newPage());
    await page.goto(`${config.airbnbBaseUrl}/hosting/calendar`, { waitUntil: 'domcontentloaded' });
    addLog('Chrome opened. Waiting for you to confirm login in Admin UI...');

    // Wait until the Admin UI calls POST /continue (or POST /stop)
    await new Promise((resolve) => {
      loginContinueResolver = resolve;
    });
    loginContinueResolver = null;

    if (cancelRequested) {
      job.status = 'idle';
      job.progressText = 'Cancelled.';
      await activeContext.close().catch(() => {});
      activeContext = null;
      return;
    }

    job.status = 'scanning';
    const monthsToScan = getYearMonthsInRange(fromDate, toDate);
    addLog(`Starting calendar scan across ${monthsToScan.length} month(s)...`);

    const reservationsByKey = new Map();
    const clickedSignatures = new Set();
    const scannedVisibleMonths = new Set();

    for (let idx = 0; idx < monthsToScan.length; idx++) {
      if (cancelRequested) break;
      const { year, month } = monthsToScan[idx];
      const targetName = `${MONTH_NAMES[month]} ${year}`;
      job.currentMonth = targetName;
      job.progressText = `[${idx + 1}/${monthsToScan.length}] Scanning ${targetName}...`;
      addLog(`[${idx + 1}/${monthsToScan.length}] Switching Calendar to ${targetName}...`);

      const nav = await navigateCalendarToMonth(page, year, month);
      const visibleMonth = nav.label;
      addLog(`📅 Target: ${targetName} | Visible: ${visibleMonth}`);

      if (scannedVisibleMonths.has(visibleMonth)) {
        addLog(`⏭️ Already scanned ${visibleMonth} — skipping.`);
        continue;
      }
      scannedVisibleMonths.add(visibleMonth);

      let found = await scanVisibleCalendar(page, reservationsByKey, clickedSignatures, year);
      await page.mouse.move(520, 420);
      await page.mouse.wheel(0, -480);
      await page.waitForTimeout(1400);
      found += await scanVisibleCalendar(page, reservationsByKey, clickedSignatures, year);

      addLog(`→ Found ${found} new booking(s) in ${visibleMonth} (Total: ${reservationsByKey.size}).`);
      await page.waitForTimeout(1200);
    }

    const reservations = Array.from(reservationsByKey.values())
      .filter((r) => r.checkInDate && r.checkOutDate && r.checkOutDate >= fromDate && r.checkInDate <= toDate)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

    const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
    fs.writeFileSync(
      outJsonPath,
      JSON.stringify({ source: 'Airbnb', fromDate, toDate, extractedAt: new Date().toISOString(), reservations }, null, 2)
    );

    job.reservations = reservations;
    job.status = cancelRequested ? 'idle' : 'done';
    job.progressText = `Extracted ${reservations.length} booking(s) (${fromDate} → ${toDate}).`;
    addLog(`✅ Done! Extracted ${reservations.length} booking(s) and saved to airbnb-upcoming.json.`);
  } catch (err) {
    job.status = 'error';
    job.error = err?.message || String(err);
    job.progressText = `Error: ${job.error}`;
    addLog(`❌ Error: ${job.error}`);
  } finally {
    if (activeContext) {
      await activeContext.close().catch(() => {});
      activeContext = null;
    }
  }
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && urlPath === '/health') {
    return sendJson(res, 200, { ok: true, status: job.status });
  }

  if (req.method === 'GET' && urlPath === '/status') {
    return sendJson(res, 200, {
      status: job.status,
      fromDate: job.fromDate,
      toDate: job.toDate,
      currentMonth: job.currentMonth,
      progressText: job.progressText,
      logs: job.logs,
      extractedCount: job.reservations.length,
      reservations: job.status === 'done' ? job.reservations : [],
      error: job.error,
    });
  }

  if (req.method === 'POST' && urlPath === '/start') {
    if (job.status === 'waiting_login' || job.status === 'scanning') {
      return sendJson(res, 409, { error: 'An extraction is already running.' });
    }
    const body = await readJsonBody(req);
    const todayIso = new Date().toISOString().slice(0, 10);
    const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const fromDate = parseFlexibleDate(body.fromDate) || todayIso;
    const toDate = parseFlexibleDate(body.toDate) || plus90;

    runExtractionJob(fromDate, toDate);
    return sendJson(res, 200, { started: true, fromDate, toDate });
  }

  if (req.method === 'POST' && urlPath === '/continue') {
    if (loginContinueResolver) {
      loginContinueResolver();
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 400, { error: 'Not waiting for login.' });
  }

  if (req.method === 'POST' && urlPath === '/stop') {
    cancelRequested = true;
    if (loginContinueResolver) loginContinueResolver();
    if (activeContext) {
      await activeContext.close().catch(() => {});
      activeContext = null;
    }
    job.status = 'idle';
    job.progressText = 'Stopped by user.';
    return sendJson(res, 200, { stopped: true });
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n✅ Karuna Villa Airbnb Extractor Bridge running on http://localhost:${PORT}`);
  console.log('   Open Admin → Channel Manager and click "Fetch from Airbnb" anytime.\n');
});
