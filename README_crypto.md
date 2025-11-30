# Crypto Assets Module

This module adds CRUD for user crypto assets with real-time pricing via CoinGecko, integrated with the existing Node.js + Express + MySQL + EJS app.

## Routes
- `GET /crypto` — List user assets, live IDR prices, total value
- `GET /crypto/add` — Add form
- `POST /crypto/add` — Create asset
- `GET /crypto/edit/:id` — Edit form
- `POST /crypto/edit/:id` — Update asset
- `POST /crypto/delete/:id` — Delete asset
- `GET /crypto/get-price?coin=<coingecko_id>` — Price JSON `{ usd, idr }`

All `/crypto` routes are protected by session auth (`req.session.user_id`). Ensure login sets `user_id`.

## Database
Uses existing tables:
- `crypto_list(id, symbol, name, coingecko_id)` — master list
- `crypto_assets(id, user_id, crypto_id, amount, created_at)` — user holdings

No `crypto_prices` table is used; prices are fetched on demand.

## Files
- `services/cryptoPriceService.js` — `fetchPrice(coingecko_id)` via CoinGecko
- `controllers/cryptoController.js` — CRUD handlers and price fetch
- `routes/cryptoRoutes.js` — Express router mounted at `/crypto`
- `views/crypto/index.ejs` — Portfolio listing
- `views/crypto/add.ejs` — Add form + live price
- `views/crypto/edit.ejs` — Edit form + live price
- `app.js` — integrates `cryptoRoutes`

## Frontend behavior
- Dropdown options include `data-coingecko` from `crypto_list.coingecko_id`.
- Selecting a crypto or changing amount triggers AJAX to `/crypto/get-price`, updating IDR price and calculated value.

## Installation
```powershell
cd E:\Me\Tugas\workshop\financial-app
npm install
```

## Run
```powershell
npm run start
```
Then open `/crypto` (after logging in).

## Smoke test (service only)
Use a simple script to verify CoinGecko API:
```powershell
node scripts/smoke-crypto.js
```
Expected: logs price object for bitcoin and IDR value computation.

## Notes
- Ensure `config/db.js` points to the correct MySQL database and tables exist.
- CoinGecko rate limits apply; consider caching or debouncing fetches in future enhancements.
