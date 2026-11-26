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
  return list;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function navigateCalendarToMonth(page, calendarBaseUrl, year, month) {
  const targetLabel = `${MONTH_NAMES[month]} ${year}`;
  const shortLabel = `${MONTH_NAMES[month].slice(0, 3)} ${year}`;

  // 1) Try Airbnb's Month/Year dropdown selector on the calendar header
  try {
    const monthBtn = page
      .locator('button:has-text("2025"), button:has-text("2026"), button:has-text("2027")')
      .filter({ hasText: /January|February|March|April|May|June|July|August|September|October|November|December/i })
      .first();
    if (await monthBtn.isVisible({ timeout: 1500 })) {
      const currentText = (await monthBtn.innerText().catch(() => '')).trim();
      if (currentText.includes(targetLabel) || currentText.includes(shortLabel)) {
        return true;
      }
      await monthBtn.click();
      await page.waitForTimeout(700);

      const option = page
        .locator(`[role="option"]:has-text("${targetLabel}"), button:has-text("${targetLabel}"), [role="menuitem"]:has-text("${targetLabel}"), li:has-text("${targetLabel}"), button:has-text("${MONTH_NAMES[month]}")`)
        .first();
      if (await option.isVisible({ timeout: 1500 })) {
        await option.click();
        await page.waitForTimeout(1800);
        return true;
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* fallback below */ }

  // 2) Fallback: direct month/year query URL on Airbnb multicalendar
  const sep = calendarBaseUrl.includes('?') ? '&' : '?';
  await page.goto(`${calendarBaseUrl}${sep}month=${month}&year=${year}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  return true;
}

async function scanVisibleCalendar(page, reservationsByKey, clickedSignatures) {
  const handles = await page.locator('button:has(img), [role="button"]:has(img)').elementHandles();
  let newlyFound = 0;

  for (const el of handles) {
    try {
      const box = await el.boundingBox();
      // Skip top navbar (y < 100) AND skip the entire left side panel (x < 360) so we NEVER click "Who's coming"!
      if (!box || box.width < 20 || box.y < 100 || box.x < 360) continue;

      const sig = await el.evaluate((node) => {
        const img = node.querySelector('img');
        return `${(node.innerText || '').trim().slice(0, 40)}|${img?.getAttribute('alt') || ''}|${img?.getAttribute('src')?.slice(-24) || ''}`;
      }).catch(() => '');
      if (!sig || clickedSignatures.has(sig)) continue;
      clickedSignatures.add(sig);

      await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1200);

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

  const calendarBaseUrl = page.url().split('?')[0];
  const monthsToScan = getYearMonthsInRange(fromDate, toDate);
  console.log(`\n🔎 Scanning ${monthsToScan.length} month(s): ${monthsToScan.map((x) => `${MONTH_NAMES[x.month].slice(0, 3)} ${x.year}`).join(', ')}`);

  const reservationsByKey = new Map();
  const clickedSignatures = new Set();

  for (let idx = 0; idx < monthsToScan.length; idx++) {
    const { year, month } = monthsToScan[idx];
    console.log(`\n   [${idx + 1}/${monthsToScan.length}] Switching Calendar to ${MONTH_NAMES[month]} ${year}...`);
    await navigateCalendarToMonth(page, calendarBaseUrl, year, month);
    const found = await scanVisibleCalendar(page, reservationsByKey, clickedSignatures);
    console.log(`   → Found ${found} new booking(s) in ${MONTH_NAMES[month]} ${year} (Total: ${reservationsByKey.size}).`);
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
