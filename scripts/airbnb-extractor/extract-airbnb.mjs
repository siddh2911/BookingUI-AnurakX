#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const configPath = path.join(__dirname, 'config.json');
const exampleConfigPath = path.join(__dirname, 'config.example.json');

const config = JSON.parse(
  fs.readFileSync(fs.existsSync(configPath) ? configPath : exampleConfigPath, 'utf8')
);

const rl = readline.createInterface({ input, output });
const profileDir = path.join(os.homedir(), '.karuna-airbnb-profile');

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
    const withYear = `${cleaned} ${now.getFullYear()}`;
    const testDate = new Date(withYear);
    if (!Number.isNaN(testDate.getTime())) {
      const diffDays = (testDate.getTime() - now.getTime()) / 86400000;
      const year = diffDays < -60 ? now.getFullYear() + 1 : now.getFullYear();
      cleaned = `${cleaned} ${year}`;
    }
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function parseReservationPanelText(rawText) {
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
  const yearMatch = bookingDateRaw.match(/\b(20\d{2})\b/);
  const refYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const parseWithRefYear = (raw) => {
    if (!raw) return '';
    if (/\b20\d{2}\b/.test(raw) || /^\d{4}-\d{2}-\d{2}/.test(raw)) return parseFlexibleDate(raw);
    return parseFlexibleDate(`${raw} ${refYear}`);
  };

  const checkInRaw = findAfterLabel(/^Check-?in$/i) || findAfterLabel(/^Check-?in\b/i);
  const checkOutRaw = findAfterLabel(/^Check-?out$/i) || findAfterLabel(/^Check-?out\b/i);
  const checkInDate = parseWithRefYear(checkInRaw);
  const checkOutDate = parseWithRefYear(checkOutRaw);

  // Full guest name is directly after "Who's coming"
  let guestName = findAfterLabel(/^Who['’]s\s+coming$/i);
  if (!guestName || /^\+?\d|adult|guest/i.test(guestName)) {
    const groupLine = lines.find((l) => /['’]s\s+group\s+of\s+\d+/i.test(l));
    if (groupLine) guestName = groupLine.replace(/['’]s\s+group\s+of\s+\d+.*$/i, '').trim();
  }
  if (!guestName) {
    guestName = confirmationCode ? `Airbnb Guest (${confirmationCode})` : 'Airbnb Guest';
  }

  const whosComing =
    lines.find((l) => /^\d+\s+(?:adult|guest)s?(?:,\s*\d+\s+(?:child|children|infant|pet)s?)?$/i.test(l)) ||
    lines.find((l) => /group\s+of\s+\d+/i.test(l)) ||
    '';

  // Earnings: below "Cancellation policy" / above "Total for N night(s)" or after "You earn"
  let totalAmount = 0;
  const earnLabelVal = findAfterLabel(/^You\s+earn$/i) || findAfterLabel(/^Your\s+earnings$/i);
  if (earnLabelVal && /\d/.test(earnLabelVal)) {
    totalAmount = Number(String(earnLabelVal).replace(/[^0-9.]/g, '')) || 0;
  }
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
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
  } else {
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

function resolveRoomNumber(listingName, defaultRoom) {
  const map = config.listingToRoom || {};
  const lower = String(listingName || '').toLowerCase();
  for (const [key, roomNo] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return String(roomNo);
  }
  return String(defaultRoom || config.defaultRoomNumber || '101');
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
    if (m > 12) {
      m = 1;
      y++;
    }
    if (list.length >= 18) break;
  }
  // Start from the latest month (e.g. November 2026) and walk backwards smoothly to the earliest month (e.g. January 2026)
  return list.reverse();
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function findTopLeftDateSelector(page) {
  // Locate the Month/Date selector button on the top-left of Airbnb's Calendar (x < 520, y: 40..250)
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
      return { moved: target.scrollTop !== before, scrollTop: target.scrollTop, maxScroll: target.scrollHeight - target.clientHeight };
    }
    const beforeW = window.scrollY;
    window.scrollBy(0, dy);
    return { moved: window.scrollY !== beforeW, scrollTop: window.scrollY, maxScroll: document.body.scrollHeight };
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

  // 1) Click the TOP-LEFT Date/Month Selector on Airbnb Calendar and pick the target month
  try {
    const selector = await findTopLeftDateSelector(page);
    if (selector) {
      const tagName = await selector.el.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'select') {
        await selector.el.selectOption({ label: targetFull }).catch(async () => {
          await selector.el.selectOption({ label: `${targetShort} ${year}` }).catch(() => {});
        });
        await page.waitForTimeout(1500);
        currentLabel = await getVisibleCalendarMonthLabel(page);
        if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
      } else {
        await selector.el.click({ timeout: 2000 });
        await page.waitForTimeout(800);

        // Log what options appeared inside the opened dropdown so we can verify
        const visibleOpts = await page.evaluate(() => {
          const pop = document.querySelector('[role="listbox"], [role="menu"], [role="dialog"], [data-testid*="popover"]');
          if (!pop) return [];
          return Array.from(pop.querySelectorAll('button, [role="option"], [role="menuitem"], li'))
            .map((e) => (e.innerText || '').trim().replace(/\s+/g, ' '))
            .filter((t) => t.length >= 3 && t.length <= 30)
            .slice(0, 15);
        }).catch(() => []);
        if (visibleOpts.length > 0) {
          console.log(`   🔽 Date selector "${selector.text}" options: ${visibleOpts.join(' | ')}`);
        }

        const optionSelectors = [
          `[role="option"]:has-text("${targetFull}")`,
          `[role="menuitem"]:has-text("${targetFull}")`,
          `button:has-text("${targetFull}")`,
          `li:has-text("${targetFull}")`,
          `[role="option"]:has-text("${targetShort} ${year}")`,
          `button:has-text("${targetShort} ${year}")`,
          `[role="listbox"] :text-is("${targetFull}")`,
          `[role="dialog"] button:has-text("${targetFull}")`,
          `[role="menu"] button:has-text("${targetFull}")`,
        ];

        let clickedOption = false;
        for (const sel of optionSelectors) {
          const opt = page.locator(sel).first();
          if ((await opt.count().catch(() => 0)) > 0) {
            await opt.scrollIntoViewIfNeeded().catch(() => {});
            if (await opt.isVisible({ timeout: 400 }).catch(() => false)) {
              await opt.click({ timeout: 1500 }).catch(() => {});
              clickedOption = true;
              break;
            }
          }
        }

        if (clickedOption) {
          await page.waitForTimeout(2600);
          currentLabel = await getVisibleCalendarMonthLabel(page);
          if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
        } else {
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
    } else {
      console.log('   ⚠️  Top-left date selector button not found.');
    }
  } catch { /* fallback below */ }

  // 2) Try scrolling directly to an already-rendered month heading in the DOM
  const jumped = await page.evaluate(({ full, shortName, y }) => {
    const nodes = Array.from(document.querySelectorAll('h1, h2, h3, div, span')).filter((el) => {
      if (el.children.length > 2) return false;
      const t = (el.innerText || '').trim();
      return t.toLowerCase() === full.toLowerCase() || t.toLowerCase() === `${shortName} ${y}`.toLowerCase();
    });
    if (nodes[0]) {
      nodes[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  }, { full: targetFull, shortName: targetShort, y: year }).catch(() => false);

  if (jumped) {
    await page.waitForTimeout(2000);
    currentLabel = await getVisibleCalendarMonthLabel(page);
    if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
  }

  // 3) Slowly scroll the calendar container UP (for earlier months) or DOWN (for later months) until target appears
  const curParsed = parseMonthYearFromLabel(currentLabel, new Date().getFullYear()) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };
  const diffMonths = (year - curParsed.year) * 12 + (month - curParsed.month);
  const stepDelta = diffMonths < 0 ? -550 : 550;

  let stuckCount = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await scrollCalendarContainer(page, stepDelta);
    if (!res.moved) {
      await page.mouse.move(700, 420);
      await page.mouse.wheel(0, stepDelta);
    }
    await page.waitForTimeout(1500);
    currentLabel = await getVisibleCalendarMonthLabel(page);
    if (isMatch(currentLabel)) return { label: currentLabel, reachedBoundary: false };
    if (!res.moved) {
      stuckCount++;
      if (stuckCount >= 2) {
        return { label: currentLabel, reachedBoundary: true };
      }
    } else {
      stuckCount = 0;
    }
  }

  return { label: currentLabel, reachedBoundary: false };
}

async function scanVisibleCalendar(page, reservationsByKey, clickedSignatures) {
  const handles = await page.locator('button:has(img), [role="button"]:has(img)').elementHandles();
  let newlyFound = 0;

  for (const el of handles) {
    try {
      const box = await el.boundingBox();
      // Only click booking pills inside the calendar grid (x: 40..900, y >= 160);
      // NEVER click top navbar (y < 160) or anything inside the right-side guest panel (x > 900).
      if (!box || box.width < 20 || box.y < 160 || box.x < 40 || box.x > 900) continue;

      const isInsideGuestPanel = await el.evaluate((node) => {
        if (node.closest('aside, [role="dialog"], [role="complementary"]')) return true;
        let cur = node.parentElement;
        for (let d = 0; d < 6 && cur; d++) {
          const t = cur.innerText || '';
          if (t.length < 4000 && /Who['’]s\s+coming|Cancellation\s+policy|Manage\s+reservation/i.test(t)) {
            return true;
          }
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
      await page.waitForTimeout(2200);

      // Read ONLY the left reservation panel (must contain Check-in + Checkout + Cancellation policy / Confirmation code)
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
      const parsed = parseReservationPanelText(panelText);
      if (!parsed.checkInDate || !parsed.checkOutDate) continue;

      const key = parsed.confirmationCode || `${parsed.checkInDate}_${parsed.checkOutDate}_${parsed.guestName}`;
      if (!reservationsByKey.has(key)) {
        reservationsByKey.set(key, parsed);
        newlyFound++;
        console.log(
          `   📌 ${parsed.guestName} | ${parsed.checkInDate} → ${parsed.checkOutDate} | ${parsed.whosComing || '-'} | ₹${parsed.totalAmount} | ${parsed.phone || '-'}`
        );
      }
    } catch {
      /* ignore individual click errors */
    }
  }
  return newlyFound;
}

async function main() {
  console.log('\n=======================================================');
  console.log('  Karuna Villa — Airbnb Calendar Extractor');
  console.log('=======================================================\n');

  const todayIso = new Date().toISOString().slice(0, 10);
  const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  console.log('📅 Custom Date Range (press ENTER for defaults):');
  const fromInput = (await rl.question(`   From Date (YYYY-MM-DD) [${todayIso}]: `)).trim();
  const toInput = (await rl.question(`   To Date   (YYYY-MM-DD) [${plus90}]: `)).trim();
  const fromDate = parseFlexibleDate(fromInput) || todayIso;
  const toDate = parseFlexibleDate(toInput) || plus90;

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1360, height: 860 },
  });

  const page = context.pages()[0] || (await context.newPage());
  console.log('\n1. Opening Airbnb Calendar...');
  await page.goto(`${config.airbnbBaseUrl}/hosting/calendar`, { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Log in with your phone number & OTP if prompted, and make sure your Calendar is visible.');
  await rl.question('Press ENTER to scan your selected date range on Calendar... ');

  const monthsToScan = getYearMonthsInRange(fromDate, toDate);
  console.log(`\n🔎 Scanning ${monthsToScan.length} month(s): ${monthsToScan.map((x) => `${MONTH_NAMES[x.month].slice(0, 3)} ${x.year}`).join(', ')}`);

  const reservationsByKey = new Map();
  const clickedSignatures = new Set();
  const scannedVisibleMonths = new Set();

  for (let idx = 0; idx < monthsToScan.length; idx++) {
    const { year, month } = monthsToScan[idx];
    const targetName = `${MONTH_NAMES[month]} ${year}`;
    console.log(`\n   [${idx + 1}/${monthsToScan.length}] Switching Calendar to ${targetName}...`);
    const nav = await navigateCalendarToMonth(page, year, month);
    const visibleMonth = nav.label;
    console.log(`   📅 Target: ${targetName} | Currently visible on Airbnb: ${visibleMonth}`);
    if (nav.reachedBoundary) {
      console.log(`   ⚠️  Airbnb Calendar hit scroll boundary at ${visibleMonth}.`);
    }

    if (scannedVisibleMonths.has(visibleMonth)) {
      console.log(`   ⏭️  Already scanned ${visibleMonth} — skipping duplicate scan.`);
      continue;
    }
    scannedVisibleMonths.add(visibleMonth);

    const found = await scanVisibleCalendar(page, reservationsByKey, clickedSignatures);
    console.log(`   → Found ${found} new booking(s) in ${visibleMonth} (Total: ${reservationsByKey.size}).`);
    await page.waitForTimeout(1500);
  }

  const reservations = Array.from(reservationsByKey.values())
    .filter((r) => r.checkInDate && r.checkOutDate && r.checkOutDate >= fromDate && r.checkInDate <= toDate)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ source: 'Airbnb', fromDate, toDate, extractedAt: new Date().toISOString(), reservations }, null, 2)
  );
  console.log(`\n💾 Saved ${reservations.length} reservation(s) (${fromDate} → ${toDate}) to: ${outJsonPath}`);

  if (reservations.length === 0) {
    console.log('\nNo bookings matched your date range.');
    await context.close();
    rl.close();
    return;
  }

  console.table(
    reservations.map((r) => ({
      Code: r.confirmationCode || '-',
      Guest: r.guestName,
      Phone: r.phone || '-',
      CheckIn: r.checkInDate,
      CheckOut: r.checkOutDate,
      Guests: r.whosComing || '-',
      Earnings: r.totalAmount ? `₹${r.totalAmount}` : '-',
      Room: resolveRoomNumber(r.listing),
    }))
  );

  const pushNow = (await rl.question('\nUpdate these bookings in Admin Panel now? (y/N): ')).trim().toLowerCase();
  if (pushNow !== 'y' && pushNow !== 'yes') {
    console.log(`\nYou can upload ${outJsonPath} anytime in Admin → Channel Manager → Import Calendar.`);
    await context.close();
    rl.close();
    return;
  }

  const adminPage = await context.newPage();
  await adminPage.goto(`${config.adminUiBaseUrl}/channels`, { waitUntil: 'domcontentloaded' });
  await rl.question('\n👉 Make sure you are signed in to Karuna Villa Admin in Chrome, then press ENTER to sync... ');

  const defaultRoom =
    (await rl.question(`Target Room Number [${config.defaultRoomNumber || '101'}]: `)).trim() ||
    config.defaultRoomNumber ||
    '101';

  const preview = await adminPage.evaluate(
    async ({ apiBase, roomNo, list }) => {
      const resp = await fetch(`${apiBase}/rooms/${encodeURIComponent(roomNo)}/reservations/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: 'Airbnb', reservations: list }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      return data;
    },
    { apiBase: config.adminApiBaseUrl, roomNo: defaultRoom, list: reservations }
  );

  const overrideUids = [];
  if (preview.conflicts && preview.conflicts.length > 0) {
    console.log(`\n⚠️  Found ${preview.conflicts.length} date conflict(s) on Room ${defaultRoom}:`);
    for (const c of preview.conflicts) {
      const existingDesc = (c.existingBookings || [])
        .map((e) => `${e.guestName} (${e.bookingSource}: ${e.checkInDate} → ${e.checkOutDate})`)
        .join(', ');
      const ans = (
        await rl.question(
          `   Incoming: ${c.guestName} (${c.checkInDate} → ${c.checkOutDate})\n` +
          `   Existing: ${existingDesc}\n` +
          `   Should I override this date? (y/N): `
        )
      ).trim().toLowerCase();
      if (ans === 'y' || ans === 'yes') overrideUids.push(c.uid);
    }
  }

  const result = await adminPage.evaluate(
    async ({ apiBase, roomNo, list, overrides }) => {
      const resp = await fetch(`${apiBase}/rooms/${encodeURIComponent(roomNo)}/reservations/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source: 'Airbnb', reservations: list, overrideUids: overrides }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      return data;
    },
    { apiBase: config.adminApiBaseUrl, roomNo: defaultRoom, list: reservations, overrides: overrideUids }
  );

  console.log(
    `\n✅ Room ${defaultRoom} updated: imported=${result.importedCount}, overridden=${result.overriddenCount}, skippedConflicts=${result.skippedConflicts}, alreadySynced=${result.alreadySyncedCount}`
  );
  console.log('🎉 Refresh Admin → Bookings to see your updated Airbnb reservations.');

  await context.close();
  rl.close();
}

main().catch((err) => {
  console.error('\n❌ Extractor error:', err.message || err);
  rl.close();
  process.exit(1);
});
