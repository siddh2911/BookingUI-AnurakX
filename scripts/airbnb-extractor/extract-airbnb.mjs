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
  const cleaned = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseAirbnbCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (...names) => headers.findIndex((h) => names.some((n) => h.includes(n)));

  const iCode = idx('confirmation code', 'code');
  const iStatus = idx('status');
  const iGuest = idx('guest name', 'guest');
  const iContact = idx('contact', 'phone');
  const iStart = idx('start date', 'check-in', 'checkin');
  const iEnd = idx('end date', 'check-out', 'checkout');
  const iListing = idx('listing');
  const iEarnings = idx('earnings', 'payout', 'total');

  const todayIso = new Date().toISOString().slice(0, 10);
  const rows = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const status = iStatus >= 0 ? cols[iStatus] || '' : '';
    if (/cancel/i.test(status)) continue;

    const checkInDate = parseFlexibleDate(iStart >= 0 ? cols[iStart] : '');
    const checkOutDate = parseFlexibleDate(iEnd >= 0 ? cols[iEnd] : '');
    if (!checkInDate || !checkOutDate) continue;
    if (checkOutDate < todayIso) continue;

    const code = iCode >= 0 ? cols[iCode] : '';
    const guestName = iGuest >= 0 ? cols[iGuest] : '';
    const phone = iContact >= 0 ? cols[iContact] : '';
    const listing = iListing >= 0 ? cols[iListing] : '';
    const rawEarnings = iEarnings >= 0 ? cols[iEarnings] : '0';
    const totalAmount = Number(String(rawEarnings).replace(/[^0-9.]/g, '')) || 0;

    rows.push({
      confirmationCode: code,
      guestName: guestName || (code ? `Airbnb Guest (${code})` : 'Airbnb Guest'),
      phone,
      checkInDate,
      checkOutDate,
      totalAmount,
      listing,
      source: 'Airbnb',
      notes: listing ? `Airbnb Listing: ${listing}` : 'Extracted from Airbnb Host',
    });
  }
  return rows;
}

/**
 * Recursively scans Airbnb's own GraphQL / REST JSON responses for reservation objects.
 */
function collectReservationsFromJson(node, foundMap) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectReservationsFromJson(item, foundMap);
    return;
  }

  const code =
    node.confirmation_code ||
    node.confirmationCode ||
    node.reservationCode ||
    node.code;
  const startRaw =
    node.start_date ||
    node.startDate ||
    node.check_in ||
    node.checkInDate ||
    node.checkin;
  const endRaw =
    node.end_date ||
    node.endDate ||
    node.check_out ||
    node.checkOutDate ||
    node.checkout;

  if (typeof code === 'string' && /^[A-Z0-9]{8,14}$/i.test(code) && startRaw && endRaw) {
    const status = String(node.status || node.reservationStatus || node.statusString || '');
    if (!/cancel|declin|expir/i.test(status)) {
      const checkInDate = parseFlexibleDate(startRaw);
      const checkOutDate = parseFlexibleDate(endRaw);
      const todayIso = new Date().toISOString().slice(0, 10);
      if (checkInDate && checkOutDate && checkOutDate >= todayIso) {
        const guestObj = node.guest || node.guestDetails || node.booker || {};
        const guestName =
          node.guest_name ||
          node.guestName ||
          guestObj.full_name ||
          guestObj.fullName ||
          guestObj.first_name ||
          guestObj.firstName ||
          guestObj.name ||
          `Airbnb Guest (${code.toUpperCase()})`;
        const phone =
          node.guest_phone ||
          node.guestPhone ||
          guestObj.phone ||
          guestObj.phoneNumber ||
          '';
        const listingObj = node.listing || {};
        const listing =
          node.listing_name ||
          node.listingName ||
          listingObj.name ||
          listingObj.title ||
          '';
        const rawAmt =
          node.host_payout_formatted ||
          node.earnings ||
          node.payout_price_formatted ||
          node.totalPayout ||
          node.expected_payout_amount_accurate ||
          node.payoutAmount ||
          0;
        const totalAmount = Number(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;

        const key = code.toUpperCase();
        const prev = foundMap.get(key);
        // Prefer richer object (with real guest name or non-zero amount)
        if (!prev || (totalAmount > 0 && !prev.totalAmount) || (guestName && !guestName.startsWith('Airbnb Guest') && prev.guestName.startsWith('Airbnb Guest'))) {
          foundMap.set(key, {
            confirmationCode: key,
            guestName: String(guestName).trim(),
            phone: String(phone || '').trim(),
            checkInDate,
            checkOutDate,
            totalAmount,
            listing: String(listing || '').trim(),
            source: 'Airbnb',
            notes: listing ? `Airbnb Listing: ${listing}` : 'Extracted from Airbnb Host',
          });
        }
      }
    }
  }

  for (const val of Object.values(node)) {
    if (val && typeof val === 'object') {
      collectReservationsFromJson(val, foundMap);
    }
  }
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

  // Passively capture Airbnb's own JSON responses while the user navigates
  const interceptedMap = new Map();
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (!url.includes('/api/')) return;
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const json = await response.json();
      collectReservationsFromJson(json, interceptedMap);
    } catch {
      /* ignore non-JSON or closed responses */
    }
  });

  console.log('1. Opening Airbnb login in Chrome...');
  await page.goto(`${config.airbnbBaseUrl}/login`, { waitUntil: 'domcontentloaded' });

  console.log('\n👉 Please log in to Airbnb with your PHONE NUMBER and OTP in the Chrome window.');
  console.log('   (Complete any verification Airbnb asks for.)');
  await rl.question('\nPress ENTER here once you are logged in to Airbnb Hosting... ');

  // Keep the exact domain the user is logged into (.co.in vs .com)
  let origin = config.airbnbBaseUrl;
  try {
    const currentOrigin = new URL(page.url()).origin;
    if (currentOrigin.includes('airbnb')) origin = currentOrigin;
  } catch { /* fallback */ }

  console.log(`\n2. Navigating to ${origin}/hosting/reservations/upcoming ...`);
  await page.goto(`${origin}/hosting/reservations/upcoming`, { waitUntil: 'domcontentloaded' });

  // Wait for reservation data to load
  try {
    await page.waitForSelector('a[href*="/hosting/reservations/details/"], table tbody tr, [role="row"]', {
      timeout: 12000,
    });
  } catch { /* continue */ }
  await page.waitForTimeout(3000);

  let reservations = [];

  // Strategy A: Try Airbnb's built-in Export -> Download CSV button
  try {
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible({ timeout: 3000 })) {
      console.log('   Found Airbnb "Export" button — downloading official upcoming CSV...');
      await exportBtn.click();
      await page.waitForTimeout(800);
      const csvBtn = page.locator('button:has-text("Download CSV"), a:has-text("Download CSV"), [role="menuitem"]:has-text("CSV")').first();
      if (await csvBtn.isVisible({ timeout: 3000 })) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          csvBtn.click(),
        ]);
        const csvSavePath = path.join(__dirname, 'airbnb-upcoming.csv');
        await download.saveAs(csvSavePath);
        const csvText = fs.readFileSync(csvSavePath, 'utf8');
        reservations = parseAirbnbCsv(csvText);
        console.log(`   ✅ Parsed ${reservations.length} upcoming reservations from Airbnb CSV.`);
      }
    }
  } catch {
    console.log('   (CSV export not triggered — checking live Airbnb API & DOM...)');
  }

  // Strategy B: Use intercepted Airbnb API JSON responses (most reliable for modern React SPA)
  if (reservations.length === 0 && interceptedMap.size > 0) {
    reservations = Array.from(interceptedMap.values());
    console.log(`   ✅ Extracted ${reservations.length} upcoming reservations from Airbnb API responses.`);
  }

  // Strategy C: DOM extraction across BOTH <table> rows AND modern <div>/[role="row"]/detail links
  if (reservations.length === 0) {
    console.log('   Scanning rendered reservation cards & links on page...');
    const domRows = await page.evaluate(() => {
      const items = [];
      const seenCodes = new Set();

      // Find all links to reservation details (works across table, cards, and mobile layouts)
      const detailLinks = Array.from(document.querySelectorAll('a[href*="/hosting/reservations/details/"]'));
      for (const link of detailLinks) {
        const href = link.getAttribute('href') || '';
        const m = href.match(/details\/([A-Z0-9]+)/i);
        const code = m ? m[1].toUpperCase() : '';
        if (code && seenCodes.has(code)) continue;
        if (code) seenCodes.add(code);

        const row = link.closest('tr, [role="row"], li, article') || link.parentElement?.parentElement;
        const text = (row?.innerText || link.innerText || '').trim().replace(/\s+/g, ' ');
        items.push({ code, text });
      }
      return items;
    });

    for (const r of domRows) {
      const dateMatches =
        r.text.match(/\b(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g) || [];
      const checkInDate = parseFlexibleDate(dateMatches[0]);
      const checkOutDate = parseFlexibleDate(dateMatches[1]);
      if (!checkInDate || !checkOutDate) continue;

      const amtMatch = r.text.match(/(?:₹|INR|\$|USD)\s*([\d,]+(?:\.\d{1,2})?)/i);
      const totalAmount = amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0;

      reservations.push({
        confirmationCode: r.code,
        guestName: r.code ? `Airbnb Guest (${r.code})` : 'Airbnb Guest',
        phone: '',
        checkInDate,
        checkOutDate,
        totalAmount,
        listing: '',
        source: 'Airbnb',
        notes: r.text.slice(0, 180),
      });
    }
    console.log(`   ✅ Extracted ${reservations.length} upcoming reservations from DOM.`);
  }

  // Open Calendar view as well (and capture any additional reservations from calendar API!)
  console.log(`\n3. Opening ${origin}/hosting/calendar ...`);
  await page.goto(`${origin}/hosting/calendar`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3500);

  if (reservations.length === 0 && interceptedMap.size > 0) {
    reservations = Array.from(interceptedMap.values());
    console.log(`   ✅ Extracted ${reservations.length} upcoming reservations from Airbnb Calendar API.`);
  }

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ source: 'Airbnb', extractedAt: new Date().toISOString(), reservations }, null, 2)
  );
  console.log(`\n💾 Saved extracted reservations to: ${outJsonPath}`);

  if (reservations.length === 0) {
    const debugInfo = {
      currentUrl: page.url(),
      title: await page.title().catch(() => ''),
      interceptedCount: interceptedMap.size,
      hint: 'Make sure you were fully logged into Host mode and had upcoming reservations visible before pressing ENTER.',
    };
    fs.writeFileSync(path.join(__dirname, 'debug-airbnb.json'), JSON.stringify(debugInfo, null, 2));
    console.log('\n⚠️  No upcoming reservations detected. Saved diagnostic info to debug-airbnb.json.');
    console.log('   Current URL was:', debugInfo.currentUrl);
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
      Amount: r.totalAmount,
      Room: resolveRoomNumber(r.listing),
    }))
  );

  const pushNow = (await rl.question('\n4. Push these bookings directly to Admin Panel now? (y/N): ')).trim().toLowerCase();
  if (pushNow !== 'y' && pushNow !== 'yes') {
    console.log(`\nSkipped direct push. You can upload ${outJsonPath} anytime in Admin → Channel Manager → Import Calendar.`);
    await context.close();
    rl.close();
    return;
  }

  const adminPage = await context.newPage();
  await adminPage.goto(`${config.adminUiBaseUrl}/channels`, { waitUntil: 'domcontentloaded' });
  await rl.question('\n👉 Make sure you are signed in to Karuna Villa Admin in the new Chrome tab, then press ENTER to sync... ');

  const defaultRoom =
    (await rl.question(`Default Room Number [${config.defaultRoomNumber || '101'}]: `)).trim() ||
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
