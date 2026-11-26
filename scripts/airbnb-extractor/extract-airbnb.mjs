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
      if (labelRegex.test(lines[i])) {
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

  // Reference year from "Booking date" (e.g. "Wednesday, 25 November 2026") if present
  const bookingDateRaw = findAfterLabel(/^Booking\s+date$/i);
  const yearMatch = bookingDateRaw.match(/\b(20\d{2})\b/);
  const refYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const parseWithRefYear = (raw) => {
    if (!raw) return '';
    if (/\b20\d{2}\b/.test(raw) || /^\d{4}-\d{2}-\d{2}/.test(raw)) return parseFlexibleDate(raw);
    return parseFlexibleDate(`${raw} ${refYear}`);
  };

  // Check-in & Check-out
  const checkInRaw = findAfterLabel(/^Check-?in$/i) || findAfterLabel(/^Check-?in\b/i);
  const checkOutRaw = findAfterLabel(/^Check-?out$/i) || findAfterLabel(/^Check-?out\b/i);
  let checkInDate = parseWithRefYear(checkInRaw);
  let checkOutDate = parseWithRefYear(checkOutRaw);

  if (!checkInDate || !checkOutDate) {
    const rangeMatch = text.match(
      /(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?)\s*[–—-]\s*(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2})/
    );
    if (rangeMatch) {
      if (!checkInDate) checkInDate = parseWithRefYear(rangeMatch[1]);
      if (!checkOutDate) {
        const endStr = rangeMatch[2];
        if (/^\d{1,2}$/.test(endStr) && checkInDate) {
          const [y, m] = checkInDate.split('-');
          checkOutDate = `${y}-${m}-${endStr.padStart(2, '0')}`;
        } else {
          checkOutDate = parseWithRefYear(endStr);
        }
      }
    }
  }

  // Guest Name: Airbnb puts the full guest name directly after "Who's coming"
  let guestName = findAfterLabel(/^Who['’]s\s+coming$/i);
  if (!guestName || /^\+?\d|adult|guest/i.test(guestName)) {
    // Fallback: look for "<Name>'s group of N"
    const groupLine = lines.find((l) => /['’]s\s+group\s+of\s+\d+/i.test(l));
    if (groupLine) {
      guestName = groupLine.replace(/['’]s\s+group\s+of\s+\d+.*$/i, '').trim();
    }
  }
  if (!guestName) {
    guestName = confirmationCode ? `Airbnb Guest (${confirmationCode})` : 'Airbnb Guest';
  }

  // Who's coming (guest count, e.g. "3 adults" or "group of 4")
  const whosComing =
    lines.find((l) => /^\d+\s+(?:adult|guest)s?(?:,\s*\d+\s+(?:child|children|infant|pet)s?)?$/i.test(l)) ||
    lines.find((l) => /group\s+of\s+\d+/i.test(l)) ||
    '';

  // Earnings: check "You earn", OR the currency line right below "Cancellation policy" / right above "Total for N night(s)"
  let totalAmount = 0;
  const earnLabelVal =
    findAfterLabel(/^You\s+earn$/i) ||
    findAfterLabel(/^Your\s+earnings$/i) ||
    findAfterLabel(/^Payout$/i);
  if (earnLabelVal && /\d/.test(earnLabelVal)) {
    totalAmount = Number(String(earnLabelVal).replace(/[^0-9.]/g, '')) || 0;
  }
  if (totalAmount === 0) {
    // Look for currency line right before "Total for X night"
    for (let i = 1; i < lines.length; i++) {
      if (/^Total\s+for\s+\d+\s+night/i.test(lines[i]) && /[₹$€£]\s*[\d,]+/.test(lines[i - 1])) {
        totalAmount = Number(lines[i - 1].replace(/[^0-9.]/g, '')) || 0;
        break;
      }
    }
  }
  if (totalAmount === 0) {
    // Look for first currency line after "Cancellation policy"
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

  // Phone number (full phone from Manage reservation, or fallback to Suggested door code last-4 digits)
  let phone = '';
  const phoneMatch =
    text.match(/(?:Phone|Mobile|Call)[^\n+]*(\+\d[\d\s\-()]{7,18})/i) ||
    text.match(/(\+\d{1,3}[\s-]?\d{3,5}[\s-]?\d{3,6}[\s-]?\d{0,4})/);
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    const doorCode = findAfterLabel(/^Suggested\s+door\s+code$/i);
    if (/^\d{4}$/.test(doorCode)) {
      phone = `****${doorCode}`;
    }
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
  // STEP 2: Ask for Custom Date Range to search all customers
  // =========================================================================
  const todayIso = new Date().toISOString().slice(0, 10);
  const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  console.log('\n📅 Custom Date Range Search (press ENTER for defaults):');
  const fromInput = (await rl.question(`   From Date (YYYY-MM-DD) [${todayIso}]: `)).trim();
  const toInput = (await rl.question(`   To Date   (YYYY-MM-DD) [${plus90}]: `)).trim();
  const fromDate = parseFlexibleDate(fromInput) || todayIso;
  const toDate = parseFlexibleDate(toInput) || plus90;
  console.log(`   Searching all Airbnb customers between ${fromDate} and ${toDate}...`);

  // =========================================================================
  // STEP 3: Open Calendar -> Scroll across months -> Click each guest profile -> Read Left/Side Panel
  // =========================================================================
  console.log(`\n2. Opening Calendar (${origin}/hosting/calendar)...`);
  await page.goto(`${origin}/hosting/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Calculate backward & forward month scrolls to cover fromDate -> toDate
  const nowMs = Date.now();
  const fromMs = new Date(fromDate).getTime();
  const toMs = new Date(toDate).getTime();
  const pastMonths = fromMs < nowMs ? Math.min(12, Math.ceil((nowMs - fromMs) / (28 * 86400000))) : 0;
  const futureMonths = toMs > nowMs ? Math.min(12, Math.ceil((toMs - nowMs) / (28 * 86400000))) : 0;

  // Build scroll plan: start at today (0), scroll UP for past months, then return & scroll DOWN for future months
  const scrollSteps = [0];
  for (let p = 1; p <= pastMonths; p++) scrollSteps.push(-950);
  if (futureMonths > 0 && pastMonths > 0) {
    // Jump back down past today
    for (let p = 1; p <= pastMonths; p++) scrollSteps.push(950);
  }
  for (let f = 1; f <= futureMonths; f++) scrollSteps.push(950);

  const clickedSignatures = new Set();
  let savedSamplePanel = false;

  for (let step = 0; step < scrollSteps.length; step++) {
    const deltaY = scrollSteps[step];
    if (deltaY !== 0) {
      // Scroll the ACTUAL scrollable calendar grid container (not just window) so June & other months load!
      await page.evaluate((dy) => {
        const scrollables = Array.from(document.querySelectorAll('div, main, section'))
          .filter((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (
              (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
              el.scrollHeight > el.clientHeight + 100 &&
              rect.width > 420 &&
              rect.height > 300
            );
          })
          .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
        if (scrollables[0]) {
          scrollables[0].scrollTop += dy;
        } else {
          window.scrollBy(0, dy);
        }
      }, deltaY);
      await page.waitForTimeout(1800);
    }

    const calendarBookingHandles = await page
      .locator('button:has(img), [role="button"]:has(img), a[href*="/hosting/reservations/details/"]')
      .elementHandles();

    console.log(`   [View ${step + 1}/${scrollSteps.length}] Scanning ${calendarBookingHandles.length} profile pill(s)...`);

    for (let i = 0; i < calendarBookingHandles.length; i++) {
      try {
        const el = calendarBookingHandles[i];
        const box = await el.boundingBox();
        if (!box || box.width < 20 || box.y < 100) continue; // skip top navbar avatar

        const sig = await el.evaluate((node) => {
          const img = node.querySelector('img');
          return `${(node.innerText || '').trim().slice(0, 40)}|${img?.getAttribute('alt') || ''}|${img?.getAttribute('src')?.slice(-24) || ''}`;
        }).catch(() => '');
        if (!sig || clickedSignatures.has(sig)) continue;
        clickedSignatures.add(sig);

        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(1500);

        // Read the FULL left/side reservation panel (must include BOTH Check-in AND You earn / Who's coming / Manage reservation)
        const panelData = await page.evaluate(() => {
          const allContainers = Array.from(
            document.querySelectorAll('aside, [role="dialog"], [role="complementary"], [data-testid*="panel"], [data-testid*="drawer"], section, div')
          ).filter((node) => {
            const t = node.innerText || '';
            if (t.length < 80 || t.length > 6000) return false;
            const hasDates = /Check-?in/i.test(t) && /Check-?out/i.test(t);
            const hasDetails = /You\s+earn|Your\s+earnings|Who['’]s\s+coming|Manage\s+reservation|Confirmation\s+code/i.test(t);
            return hasDates && hasDetails;
          });
          // Smallest container that STILL has BOTH dates AND earnings/manage/who's coming (so nothing is cut off!)
          allContainers.sort((a, b) => (a.innerText?.length || 99999) - (b.innerText?.length || 99999));
          const best = allContainers[0];
          const text = best ? best.innerText : '';

          // Also grab heading text inside panel for accurate guest name
          let headingName = '';
          if (best) {
            const headings = Array.from(best.querySelectorAll('h1, h2, h3'))
              .map((h) => (h.innerText || '').trim())
              .filter((s) => s.length >= 2 && s.length <= 48 && !/Check-?in|Check-?out|Reservation|Earnings|Who|Payout|^\d/i.test(s));
            headingName = headings[0] || '';
          }

          const manageLink = Array.from((best || document).querySelectorAll('a')).find(
            (a) =>
              /manage reservation/i.test(a.innerText || '') ||
              (a.getAttribute('href') || '').includes('/hosting/reservations/details/')
          );
          return {
            text,
            headingName,
            manageHref: manageLink?.getAttribute('href') || '',
          };
        });

        if (panelData.text) {
          if (!savedSamplePanel) {
            fs.writeFileSync(path.join(__dirname, 'debug-panel.txt'), panelData.text);
            savedSamplePanel = true;
          }
          const parsed = parseReservationPanelText(panelData.text);
          if (parsed.checkInDate && parsed.checkOutDate) {
            addReservation(parsed);
            console.log(
              `   📌 Found: ${parsed.guestName} | ${parsed.checkInDate} → ${parsed.checkOutDate} | ${parsed.whosComing || '-'} | ₹${parsed.totalAmount}`
            );
          }
          if (panelData.manageHref) {
            const m = panelData.manageHref.match(/details\/([A-Z0-9]+)/i);
            const code = m ? m[1].toUpperCase() : parsed.confirmationCode || `CAL_${step}_${i}`;
            const fullUrl = panelData.manageHref.startsWith('http')
              ? panelData.manageHref
              : `${origin}${panelData.manageHref}`;
            detailUrlsToVisit.set(code, fullUrl);
          } else if (parsed.confirmationCode && !detailUrlsToVisit.has(parsed.confirmationCode)) {
            detailUrlsToVisit.set(
              parsed.confirmationCode,
              `${origin}/hosting/reservations/details/${parsed.confirmationCode}`
            );
          }
        }
      } catch {
        /* ignore individual click errors */
      }
    }
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

  // Filter strictly to the custom date range [fromDate, toDate] provided by the user
  const reservations = Array.from(reservationsByKey.values())
    .filter((r) => r.checkInDate && r.checkOutDate && r.checkOutDate >= fromDate && r.checkInDate <= toDate)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ source: 'Airbnb', fromDate, toDate, extractedAt: new Date().toISOString(), reservations }, null, 2)
  );
  console.log(`\n💾 Saved ${reservations.length} reservation(s) (${fromDate} to ${toDate}) to: ${outJsonPath}`);

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
