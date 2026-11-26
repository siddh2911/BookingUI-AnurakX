# Karuna Villa — Airbnb Host Phone + OTP Extractor

Interactive extractor that opens your real Chrome browser so you can log in to Airbnb with your **phone number & OTP**, extracts all **upcoming reservations** (with full guest names, confirmation codes, dates, and payout amounts), checks for date conflicts, asks before overriding any existing booking, and updates Karuna Villa Admin.

## One-Time Setup

```bash
cd /Users/siddhantsingh/Documents/BookingUI-AnurakX/scripts/airbnb-extractor
npm install
cp config.example.json config.json
```

Edit `config.json` to map your Airbnb listing names to your Karuna Villa room numbers (e.g. `"Karuna Villa Elite": "101"`).

## Run

```bash
npm start
```

1. A visible Chrome window opens at `airbnb.co.in/login`.
2. Log in with your **phone number & OTP** in Chrome, then press **ENTER** in the terminal.
3. The script navigates to **Airbnb Hosting → Upcoming Reservations & Calendar**, extracts all upcoming bookings, and saves `airbnb-upcoming.json` (and `airbnb-upcoming.csv`).
4. Choose **y** to push directly to Admin (it will check for date conflicts and ask `y/N` before overriding any existing date), or upload `airbnb-upcoming.json` / `airbnb-upcoming.csv` in **Admin → Channel Manager → Import Calendar**.
