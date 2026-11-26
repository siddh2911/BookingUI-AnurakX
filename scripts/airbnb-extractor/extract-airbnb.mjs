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
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // DD/MM/YYYY or MM/DD/YYYY or "Nov 26, 2026" / "26 Nov 2026"
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
    if (checkOutDate < todayIso) continue; // upcoming & current stays only

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

  console.log('\n2. Navigating to Airbnb Hosting → Upcoming Reservations...');
  await page.goto(`${config.airbnbBaseUrl}/hosting/reservations/upcoming`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(3500);

  let reservations = [];

  // Strategy A: Try Airbnb's built-in "Export" -> "Download CSV" button (cleanest full data)
  try {
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible({ timeout: 4000 })) {
      console.log('   Found Airbnb "Export" button — downloading official upcoming CSV...');
      await exportBtn.click();
      await page.waitForTimeout(800);
      const csvBtn = page.locator('button:has-text("Download CSV"), a:has-text("Download CSV")').first();
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
  } catch (err) {
    console.log('   (CSV export button not triggered, falling back to live page table extraction...)');
  }

  // Strategy B: Fallback to extracting directly from the rendered Upcoming Reservations table
  if (reservations.length === 0) {
    console.log('   Reading rendered upcoming reservations table...');
    const rawRows = await page.evaluate(() => {
      const results = [];
      const tableRows = document.querySelectorAll('table tbody tr');
      tableRows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
          (td.innerText || '').trim().replace(/\s+/g, ' ')
        );
        const link = tr.querySelector('a[href*="/hosting/reservations/details/"]');
        const codeMatch = link?.getAttribute('href')?.match(/details\/([A-Z0-9]+)/i);
        if (cells.length >= 4) {
          results.push({
            cells,
            confirmationCode: codeMatch ? codeMatch[1].toUpperCase() : '',
          });
        }
      });
      return results;
    });

    for (const r of rawRows) {
      const joined = r.cells.join(' | ');
      const dateMatches = joined.match(/\b(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g) || [];
      const checkInDate = parseFlexibleDate(dateMatches[0]);
      const checkOutDate = parseFlexibleDate(dateMatches[1]);
      if (!checkInDate || !checkOutDate) continue;

      const amtMatch = joined.match(/(?:₹|INR|\$|USD)\s*([\d,]+(?:\.\d{1,2})?)/i);
      const totalAmount = amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0;

      reservations.push({
        confirmationCode: r.confirmationCode,
        guestName: r.cells[1] || r.cells[0] || (r.confirmationCode ? `Airbnb Guest (${r.confirmationCode})` : 'Airbnb Guest'),
        phone: '',
        checkInDate,
        checkOutDate,
        totalAmount,
        listing: r.cells[4] || '',
        source: 'Airbnb',
        notes: 'Extracted from Airbnb Hosting Upcoming Reservations',
      });
    }
    console.log(`   ✅ Extracted ${reservations.length} upcoming reservations from page table.`);
  }

  // Also navigate to Calendar view as requested so host can visually verify
  console.log('\n3. Opening Airbnb Hosting Calendar for visual verification...');
  await page.goto(`${config.airbnbBaseUrl}/hosting/calendar`, { waitUntil: 'domcontentloaded' }).catch(() => {});

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(outJsonPath, JSON.stringify({ source: 'Airbnb', extractedAt: new Date().toISOString(), reservations }, null, 2));
  console.log(`\n💾 Saved extracted reservations to: ${outJsonPath}`);

  if (reservations.length === 0) {
    console.log('\nNo upcoming reservations were found on the page.');
    await context.close();
    rl.close();
    return;
  }

  console.table(
    reservations.map((r) => ({
      Code: r.confirmationCode || '-',
      Guest: r.guestName,
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

  // Open Admin in a tab in the same browser so existing Admin OAuth session cookie works seamlessly!
  const adminPage = await context.newPage();
  await adminPage.goto(`${config.adminUiBaseUrl}/channels`, { waitUntil: 'domcontentloaded' });
  await rl.question('\n👉 Make sure you are signed in to Karuna Villa Admin in the new Chrome tab, then press ENTER to sync... ');

  const defaultRoom = (await rl.question(`Default Room Number [${config.defaultRoomNumber || '101'}]: `)).trim() || config.defaultRoomNumber || '101';

  // Group reservations by target room number
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
