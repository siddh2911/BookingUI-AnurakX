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
  const cleaned = String(raw).trim()
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*/i, '')
    .trim();
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

function parseAirbnbCsv(csvText, fromDate, toDate) {
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
  const iAdults = idx('adults', 'guests');

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const status = iStatus >= 0 ? cols[iStatus] || '' : '';
    if (/cancel/i.test(status)) continue;

    const checkInDate = parseFlexibleDate(iStart >= 0 ? cols[iStart] : '');
    const checkOutDate = parseFlexibleDate(iEnd >= 0 ? cols[iEnd] : '');
    if (!checkInDate || !checkOutDate) continue;
    if (checkOutDate < fromDate || checkInDate > toDate) continue;

    const code = iCode >= 0 ? cols[iCode] : '';
    const guestName = iGuest >= 0 ? cols[iGuest] : '';
    const phone = iContact >= 0 ? cols[iContact] : '';
    const listing = iListing >= 0 ? cols[iListing] : '';
    const adults = iAdults >= 0 ? cols[iAdults] : '';
    const rawEarnings = iEarnings >= 0 ? cols[iEarnings] : '0';
    const totalAmount = Number(String(rawEarnings).replace(/[^0-9.]/g, '')) || 0;

    rows.push({
      confirmationCode: code,
      guestName: guestName || (code ? `Airbnb Guest (${code})` : 'Airbnb Guest'),
      phone,
      checkInDate,
      checkOutDate,
      whosComing: adults ? `${adults} guests` : '',
      totalAmount,
      listing,
      source: 'Airbnb',
      notes: [adults ? `Guests: ${adults}` : '', code ? `Code: ${code}` : '', listing ? `Listing: ${listing}` : '']
        .filter(Boolean)
        .join(' | '),
    });
  }
  return rows.sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
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
  console.log('  Karuna Villa — Airbnb Reservations Importer');
  console.log('=======================================================\n');

  const todayIso = new Date().toISOString().slice(0, 10);
  const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  console.log('📅 Custom Date Range (press ENTER for defaults):');
  const fromInput = (await rl.question(`   From Date (YYYY-MM-DD) [${todayIso}]: `)).trim();
  const toInput = (await rl.question(`   To Date   (YYYY-MM-DD) [${plus90}]: `)).trim();
  const fromDate = parseFlexibleDate(fromInput) || todayIso;
  const toDate = parseFlexibleDate(toInput) || plus90;

  // Option 1: Use an already-downloaded Airbnb CSV (zero browser automation needed!)
  const csvPathInput = (
    await rl.question('\n📄 Path to Airbnb Reservations CSV (or press ENTER to open Airbnb in Chrome): ')
  ).trim();

  let reservations = [];
  let context = null;

  if (csvPathInput) {
    const resolved = path.resolve(csvPathInput.replace(/^['"]|['"]$/g, ''));
    const csvText = fs.readFileSync(resolved, 'utf8');
    reservations = parseAirbnbCsv(csvText, fromDate, toDate);
    console.log(`✅ Parsed ${reservations.length} reservation(s) between ${fromDate} and ${toDate} from CSV.`);
  } else {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1360, height: 860 },
      acceptDownloads: true,
    });

    const page = context.pages()[0] || (await context.newPage());
    console.log('\n1. Opening Airbnb Hosting Reservations...');
    await page.goto(`${config.airbnbBaseUrl}/hosting/reservations/all`, { waitUntil: 'domcontentloaded' });

    console.log('\n👉 In the Chrome window:');
    console.log('   1) Log in with your phone number & OTP if prompted.');
    console.log('   2) On Hosting → Reservations → All, click "Export" → "Download CSV" (or just press ENTER once the list is visible).');

    // Automatically capture the CSV if the user clicks Airbnb's Export -> Download CSV button
    let downloadedCsvPath = '';
    page.on('download', async (download) => {
      try {
        const target = path.join(__dirname, 'airbnb-export.csv');
        await download.saveAs(target);
        downloadedCsvPath = target;
        console.log(`\n   📥 Captured Airbnb CSV download: ${target}`);
      } catch { /* ignore */ }
    });

    await rl.question('\nPress ENTER here once the CSV is downloaded (or reservations list is loaded)... ');

    if (downloadedCsvPath && fs.existsSync(downloadedCsvPath)) {
      const csvText = fs.readFileSync(downloadedCsvPath, 'utf8');
      reservations = parseAirbnbCsv(csvText, fromDate, toDate);
      console.log(`✅ Parsed ${reservations.length} reservation(s) (${fromDate} → ${toDate}) from official Airbnb CSV.`);
    } else {
      // Single-pass read of the visible Reservations table (no clicking loops, no "Who's coming" clicks)
      const rows = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('table tbody tr').forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.innerText || '').trim().replace(/\s+/g, ' '));
          const link = tr.querySelector('a[href*="/hosting/reservations/details/"]');
          const m = link?.getAttribute('href')?.match(/details\/([A-Z0-9]+)/i);
          if (cells.length >= 4) out.push({ cells, code: m ? m[1].toUpperCase() : '' });
        });
        return out;
      });
      for (const r of rows) {
        const joined = r.cells.join(' | ');
        const dates = joined.match(/\b(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g) || [];
        const checkInDate = parseFlexibleDate(dates[0]);
        const checkOutDate = parseFlexibleDate(dates[1]);
        if (!checkInDate || !checkOutDate || checkOutDate < fromDate || checkInDate > toDate) continue;
        const amtMatch = joined.match(/(?:₹|INR|\$|USD)\s*([\d,]+(?:\.\d{1,2})?)/i);
        reservations.push({
          confirmationCode: r.code,
          guestName: r.cells[1] || r.cells[0] || (r.code ? `Airbnb Guest (${r.code})` : 'Airbnb Guest'),
          phone: '',
          checkInDate,
          checkOutDate,
          whosComing: '',
          totalAmount: amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0,
          listing: r.cells[4] || '',
          source: 'Airbnb',
          notes: r.code ? `Code: ${r.code}` : 'Extracted from Airbnb Reservations',
        });
      }
      console.log(`✅ Read ${reservations.length} reservation(s) from visible table.`);
    }
  }

  const outJsonPath = path.join(__dirname, 'airbnb-upcoming.json');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ source: 'Airbnb', fromDate, toDate, extractedAt: new Date().toISOString(), reservations }, null, 2)
  );
  console.log(`\n💾 Saved ${reservations.length} reservation(s) to: ${outJsonPath}`);

  if (reservations.length === 0) {
    console.log('\nNo reservations matched that date range.');
    if (context) await context.close();
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
      Amount: r.totalAmount ? `₹${r.totalAmount}` : '-',
      Room: resolveRoomNumber(r.listing),
    }))
  );

  const pushNow = (await rl.question('\nUpdate these bookings in Admin Panel now? (y/N): ')).trim().toLowerCase();
  if (pushNow !== 'y' && pushNow !== 'yes') {
    console.log(`\nYou can upload ${outJsonPath} anytime in Admin → Channel Manager → Import Calendar.`);
    if (context) await context.close();
    rl.close();
    return;
  }

  if (!context) {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1360, height: 860 },
    });
  }

  const adminPage = await context.newPage();
  await adminPage.goto(`${config.adminUiBaseUrl}/channels`, { waitUntil: 'domcontentloaded' });
  await rl.question('\n👉 Make sure you are signed in to Karuna Villa Admin in Chrome, then press ENTER to sync... ');

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
