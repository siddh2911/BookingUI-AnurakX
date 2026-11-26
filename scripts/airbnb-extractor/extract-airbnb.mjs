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
  let cleaned = String(raw).trim()
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*/i, '')
    .replace(/\s+at\s+.*$/i, '')
    .replace(/\s+\d{1,2}:\d{2}.*$/i, '')
    .trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);

  // If year is missing (e.g. "26 Nov" or "Nov 26"), append current year (or next year if >60 days in past)
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

/**
 * Extracts Guest Name, Check-in, Check-out, Who's coming, Earnings ("You earn"),
 * Confirmation code, and Phone number from Airbnb's Today drawer / Calendar side panel / Manage Reservation page.
 */
function parseReservationPanelText(rawText, fallbackCode = '') {
  const text = String(rawText || '').replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const findAfterLabel = (labelRegex) => {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(labelRegex);
      if (m) {
        // Value on same line after label, or on next line
        const rest = lines[i].replace(labelRegex, '').replace(/^[:\s-]+/, '').trim();
        if (rest) return rest;
        if (i + 1 < lines.length) return lines[i + 1];
      }
    }
    return '';
  };

  // Confirmation code
  const codeMatch =
    text.match(/Confirmation\s*code[\s:\n]+([A-Z0-9]{8,14})/i) ||
    text.match(/\b(HM[A-Z0-9]{8})\b/);
  const confirmationCode = (codeMatch ? codeMatch[1] : fallbackCode || '').toUpperCase();

  // Check-in & Check-out
  const checkInRaw = findAfterLabel(/^Check-?in$/i) || findAfterLabel(/^Check-?in\b/i);
  const checkOutRaw = findAfterLabel(/^Check-?out$/i) || findAfterLabel(/^Check-?out\b/i);
  let checkInDate = parseFlexibleDate(checkInRaw);
  let checkOutDate = parseFlexibleDate(checkOutRaw);

  // Fallback: look for "26 Nov – 28 Nov" or "Nov 26 – 28"
  if (!checkInDate || !checkOutDate) {
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?)\s*[–—-]\s*(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2})/
    );
    if (rangeMatch) {
      if (!checkInDate) checkInDate = parseFlexibleDate(rangeMatch[1]);
      if (!checkOutDate) {
        let endStr = rangeMatch[2];
        if (/^\d{1,2}$/.test(endStr) && checkInDate) {
          // Same month, e.g. "Nov 26 – 28"
          const [y, m] = checkInDate.split('-');
          checkOutDate = `${y}-${m}-${endStr.padStart(2, '0')}`;
        } else {
          checkOutDate = parseFlexibleDate(endStr);
        }
      }
    }
  }

  // Who's coming
  const whosComing =
    findAfterLabel(/^Who['’]s\s+coming$/i) ||
    findAfterLabel(/^Guests$/i) ||
    (text.match(/\b\d+\s+(?:adult|guest)s?(?:,\s*\d+\s+(?:child|children|infant|pet)s?)?/i)?.[0] || '');

  // Earnings / You earn
  let earningsRaw =
    findAfterLabel(/^You\s+earn$/i) ||
    findAfterLabel(/^Your\s+earnings$/i) ||
    findAfterLabel(/^Total\s*\([A-Z]{3}\)$/i) ||
    findAfterLabel(/^Payout$/i);
  if (!earningsRaw || !/\d/.test(earningsRaw)) {
    const earnInline = text.match(/(?:You\s+earn|Your\s+earnings|Total\s*\(INR\)|Payout)[^\n₹$]*([₹$]\s*[\d,]+(?:\.\d{1,2})?)/i);
    if (earnInline) earningsRaw = earnInline[1];
  }
  const totalAmount = Number(String(earningsRaw || '0').replace(/[^0-9.]/g, '')) || 0;

  // Phone number (from Manage reservation / Call section)
  let phone = '';
  const phoneMatch =
    text.match(/(?:Phone|Mobile|Call)[^\n+]*(\+\d[\d\s\-()]{7,18})/i) ||
    text.match(/(\+\d{1,3}[\s-]?\d{3,5}[\s-]?\d{3,6}[\s-]?\d{0,4})/);
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
  }

  // Guest name (usually the first non-status heading line in the drawer/page)
  const skipWords = /^(Today|Upcoming|Confirmed|Checked in|Checking in|Checking out|Arriving|Currently hosting|Reservation|Details|Manage reservation|Message|Call|Help|Airbnb|Close|Back|All reservations)$/i;
  let guestName = '';
  for (const line of lines.slice(0, 12)) {
    if (skipWords.test(line)) continue;
    if (/^\d|\bCheck-?in\b|\bCheck-?out\b|\bnight|\bguest|\badult|₹|\$|HM[A-Z0-9]{8}/i.test(line)) continue;
    if (line.length >= 2 && line.length <= 48) {
      guestName = line;
      break;
    }
  }
  if (!guestName) {
    guestName = confirmationCode ? `Airbnb Guest (${confirmationCode})` : 'Airbnb Guest';
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
    notes: noteParts.join(' | ') || 'Extracted from Airbnb Host',
  };
}

async function extractFromReservationDetailsPage(page, url, fallbackCode = '') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Click "Show phone number" or "Call" if hidden behind a button
  try {
    const showPhone = page.locator('button:has-text("Show phone"), button:has-text("Call"), a:has-text("Show phone")').first();
    if (await showPhone.isVisible({ timeout: 1500 })) {
      await showPhone.click().catch(() => {});
      await page.waitForTimeout(800);
    }
  } catch { /* ignore */ }

  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  return parseReservationPanelText(bodyText, fallbackCode);
}

function resolveRoomNumber(listingName, defaultRoom) {
  const map = config.listingToRoom || {};
  const lower = String(listingName || '').toLowerCase();
  for (const [key, roomNo] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return String(roomNo);
  }
  return String(defaultRoom || config.defaultRoomNumber || '101');
}

async function main() {
  console.log('\n=======================================================');
  console.log('  Karuna Villa — Interactive Airbnb Host Extractor');
  console.log('=======================================================\n');

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1360, height: 860 },
    acceptDownloads: true,
  });

  const page = context.pages()[0] || (await context.newPage());

  console.log('1. Opening Airbnb login in Chrome...');
  await page.goto(`${config.airbnbBaseUrl}/login`, { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Please log in to Airbnb with your PHONE NUMBER and OTP in the Chrome window.');
  console.log('   (Complete any verification Airbnb asks for.)');
  await rl.question('\nPress ENTER here once you are logged in to Airbnb Hosting... ');

  let origin = config.airbnbBaseUrl;
  try {
    const currentOrigin = new URL(page.url()).origin;
    if (currentOrigin.includes('airbnb')) origin = currentOrigin;
  } catch { /* fallback */ }

  const reservationsByKey = new Map();
  const detailUrlsToVisit = new Map(); // code -> url

  const addReservation = (res) => {
    if (!res || !res.checkInDate || !res.checkOutDate) return;
    const key = res.confirmationCode || `${res.checkInDate}_${res.checkOutDate}_${res.guestName}`;
    const prev = reservationsByKey.get(key);
    if (!prev) {
      reservationsByKey.set(key, res);
    } else {
      reservationsByKey.set(key, {
        ...prev,
        ...res,
        guestName: res.guestName && !res.guestName.startsWith('Airbnb Guest') ? res.guestName : prev.guestName,
        phone: res.phone || prev.phone,
        totalAmount: res.totalAmount > 0 ? res.totalAmount : prev.totalAmount,
        whosComing: res.whosComing || prev.whosComing,
      });
    }
  };

  // =========================================================================
  // FLOW 1: Today -> Hit Tab 1 (Today / Upcoming) -> Extract each booking + Manage Reservation (Phone)
  // =========================================================================
  console.log(`\n2. Going to Hosting → Today (${origin}/hosting)...`);
  await page.goto(`${origin}/hosting`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Collect reservation links from Today tab and Upcoming tab
  const tabLabels = ['Today', 'Upcoming', 'Arriving soon', 'Currently hosting'];
  for (const label of tabLabels) {
    try {
      const tab = page.locator(`button[role="tab"]:has-text("${label}"), button:has-text("${label}")`).first();
      if (await tab.isVisible({ timeout: 1500 })) {
        console.log(`   Checking "${label}" tab...`);
        await tab.click().catch(() => {});
        await page.waitForTimeout(2000);
      }
    } catch { /* ignore */ }

    // Find direct reservation detail links
    const links = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('a[href*="/hosting/reservations/details/"]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const m = href.match(/details\/([A-Z0-9]+)/i);
        if (m) out.push({ code: m[1].toUpperCase(), href });
      });
      return out;
    });
    for (const l of links) {
      const fullUrl = l.href.startsWith('http') ? l.href : `${origin}${l.href}`;
      detailUrlsToVisit.set(l.code, fullUrl);
    }

    // Also try clicking reservation cards on Today/Upcoming that open a modal/drawer without an <a> href
    const cardCount = await page.locator('[data-testid*="reservation"], [data-testid*="booking"]').count().catch(() => 0);
    for (let i = 0; i < Math.min(cardCount, 20); i++) {
      try {
        const card = page.locator('[data-testid*="reservation"], [data-testid*="booking"]').nth(i);
        if (!(await card.isVisible({ timeout: 1000 }))) continue;
        await card.click();
        await page.waitForTimeout(1500);

        const drawerText = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"], aside, [aria-modal="true"]');
          return (dialog || document.body)?.innerText || '';
        });
        const parsed = parseReservationPanelText(drawerText);
        if (parsed.checkInDate && parsed.checkOutDate) {
          addReservation(parsed);
        }

        // Check for "Manage reservation" link inside drawer to grab full phone number
        const manageHref = await page.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a')).find((el) =>
            /manage reservation|view details|reservation details/i.test(el.innerText || '') ||
            (el.getAttribute('href') || '').includes('/hosting/reservations/details/')
          );
          return a?.getAttribute('href') || '';
        });
        if (manageHref) {
          const m = manageHref.match(/details\/([A-Z0-9]+)/i);
          const code = m ? m[1].toUpperCase() : parsed.confirmationCode || `RES_${i}`;
          const fullUrl = manageHref.startsWith('http') ? manageHref : `${origin}${manageHref}`;
          detailUrlsToVisit.set(code, fullUrl);
        }

        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
      } catch { /* ignore */ }
    }
  }

  // =========================================================================
  // FLOW 2: Calendar -> Click on each user profile / booking bar -> Extract details + Manage reservation
  // =========================================================================
  console.log(`\n3. Opening Calendar (${origin}/hosting/calendar) to scan booked guest bars...`);
  await page.goto(`${origin}/hosting/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Find clickable guest booking bars / avatars inside the calendar
  const calendarBookingHandles = await page.locator(
    'button:has(img[alt]), [role="button"]:has(img[alt]), a[href*="/hosting/reservations/details/"]'
  ).elementHandles();

  console.log(`   Found ${calendarBookingHandles.length} potential guest profile pill(s) on Calendar...`);
  for (let i = 0; i < Math.min(calendarBookingHandles.length, 30); i++) {
    try {
      const el = calendarBookingHandles[i];
      const box = await el.boundingBox();
      if (!box || box.width < 20 || box.y < 110) continue; // skip top navbar avatar

      await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const panelText = await page.evaluate(() => {
        const panel = document.querySelector('aside, [role="dialog"], [data-testid*="panel"], [data-testid*="drawer"]');
        return (panel || document.body)?.innerText || '';
      });

      if (/Check-?in|You earn|Confirmation code|Manage reservation/i.test(panelText)) {
        const parsed = parseReservationPanelText(panelText);
        if (parsed.checkInDate && parsed.checkOutDate) {
          addReservation(parsed);
          console.log(
            `   📌 Calendar booking: ${parsed.guestName} | ${parsed.checkInDate} → ${parsed.checkOutDate} | ₹${parsed.totalAmount}`
          );
        }

        // Check for "Manage reservation" link inside the side panel
        const manageHref = await page.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a')).find((node) =>
            /manage reservation/i.test(node.innerText || '') ||
            (node.getAttribute('href') || '').includes('/hosting/reservations/details/')
          );
          return a?.getAttribute('href') || '';
        });
        if (manageHref) {
          const m = manageHref.match(/details\/([A-Z0-9]+)/i);
          const code = m ? m[1].toUpperCase() : parsed.confirmationCode || `CAL_${i}`;
          const fullUrl = manageHref.startsWith('http') ? manageHref : `${origin}${manageHref}`;
          detailUrlsToVisit.set(code, fullUrl);
        }
      }
    } catch { /* ignore */ }
  }

  // =========================================================================
  // STEP 4: Visit each "Manage reservation" detail page to extract full Phone Number & Earnings
  // =========================================================================
  if (detailUrlsToVisit.size > 0) {
    console.log(`\n4. Opening ${detailUrlsToVisit.size} "Manage reservation" page(s) to extract phone numbers & earnings...`);
    for (const [code, url] of detailUrlsToVisit.entries()) {
      try {
        console.log(`   🔎 Reading ${code} (${url})...`);
        const detail = await extractFromReservationDetailsPage(page, url, code);
        addReservation(detail);
      } catch (err) {
        console.log(`   ⚠️ Could not read ${code}: ${err.message}`);
      }
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const reservations = Array.from(reservationsByKey.values()).filter(
    (r) => r.checkInDate && r.checkOutDate && r.checkOutDate >= todayIso
  );

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ source: 'Airbnb', extractedAt: new Date().toISOString(), reservations }, null, 2)
  );
  console.log(`\n💾 Saved ${reservations.length} upcoming reservation(s) to: ${outJsonPath}`);

  if (reservations.length === 0) {
    console.log('\n⚠️  No upcoming bookings were found automatically.');
    console.log('   Tip: Open a booking in the Chrome window right now, or export CSV from Airbnb Hosting → Reservations.');
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
      YouEarn: r.totalAmount ? `₹${r.totalAmount}` : '-',
      Room: resolveRoomNumber(r.listing),
    }))
  );

  const pushNow = (await rl.question('\n5. Update these bookings in Admin Panel now? (y/N): ')).trim().toLowerCase();
  if (pushNow !== 'y' && pushNow !== 'yes') {
    console.log(`\nSkipped direct push. You can upload ${outJsonPath} anytime in Admin → Channel Manager → Import Calendar.`);
    await context.close();
    rl.close();
    return;
  }

  const adminPage = await context.newPage();
  await adminPage.goto(`${config.adminUiBaseUrl}/channels`, { waitUntil: 'domcontentloaded' });
  await rl.question('\n👉 Make sure you are signed in to Karuna Villa Admin in the Chrome tab, then press ENTER to sync... ');

  const defaultRoom =
    (await rl.question(`Target Room Number [${config.defaultRoomNumber || '101'}]: `)).trim() ||
    config.defaultRoomNumber ||
    '101';

  const byRoom = new Map();
  for (const r of reservations) {
    const roomNo = resolveRoomNumber(r.listing, defaultRoom);
    if (!byRoom.has(roomNo)) byRoom.set(roomNo, []);
    byRoom.get(roomNo).push(r);
  }

  for (const [roomNumber, roomResList] of byRoom.entries()) {
    console.log(`\n🔄 Checking Room ${roomNumber} (${roomResList.length} reservation(s)) for date conflicts...`);
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
      { apiBase: config.adminApiBaseUrl, roomNo: roomNumber, list: roomResList }
    );

    const overrideUids = [];
    if (preview.conflicts && preview.conflicts.length > 0) {
      console.log(`\n⚠️  Found ${preview.conflicts.length} date conflict(s) on Room ${roomNumber}:`);
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
        if (ans === 'y' || ans === 'yes') {
          overrideUids.push(c.uid);
        }
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
      { apiBase: config.adminApiBaseUrl, roomNo: roomNumber, list: roomResList, overrides: overrideUids }
    );

    console.log(
      `✅ Room ${roomNumber} updated: imported=${result.importedCount}, overridden=${result.overriddenCount}, skippedConflicts=${result.skippedConflicts}, alreadySynced=${result.alreadySyncedCount}`
    );
  }

  console.log('\n🎉 All done! Refresh Admin → Bookings to see your updated Airbnb reservations.');
  await context.close();
  rl.close();
}

main().catch((err) => {
  console.error('\n❌ Extractor error:', err.message || err);
  rl.close();
  process.exit(1);
});
