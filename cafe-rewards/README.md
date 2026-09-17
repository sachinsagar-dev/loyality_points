# Café Rewards Programme

A full-stack staff counter for managing café members, purchase points, and point redemptions. The browser uses plain HTML, CSS, and JavaScript; the server exposes a REST API backed by MongoDB and Mongoose.

## Architecture

- `public/`: framework-free counter interface.
- `routes/` and `controllers/`: REST routing and thin HTTP handlers.
- `services/rewardService.js`: centralized reward calculations and atomic balance changes.
- `models/`: Mongoose persistence model with a unique phone index.
- `config/` and `middleware/`: database setup and shared error handling.

## Setup

1. Install Node.js 18+ and Docker Desktop or Docker Engine with Compose.
2. From `cafe-rewards/`, install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `MONGO_URI` and `PORT`. `.env` is ignored by Git.
4. Start MongoDB with `npm run db:up`.
5. Start the application with `npm start` and open `http://localhost:3000`.

To populate the local database with three demo staff accounts and thirty demo customers, run `npm run seed`. The command is idempotent and prints generated staff login passwords.

The Compose file stores MongoDB data in the named `cafe_rewards_mongo_data` volume. Stop the database with `npm run db:down`; the volume is retained for the next startup.

For a hosted MongoDB instance, skip `npm run db:up` and set `MONGO_URI` in `.env` to the provider connection string.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/cafe_rewards` |
| `PORT` | HTTP port | `3000` |
| `AUTH_SECRET` | Secret used to sign staff bearer tokens | a long random value |

## API

- `POST /api/auth/register`: register a staff user and receive a bearer token.
- `POST /api/auth/login`: log in a staff user and receive a bearer token.
- `GET /api/members?search=&page=1&limit=10&sortBy=name&order=asc`: authenticated member search with pagination and sorting.
- `GET /api/members/:phone`: look up one member by phone number.
- `POST /api/members`: create a member. Body: `{ "name": "Ava", "phone": "5551234567", "tier": "Regular" }`.
- `POST /api/members/:id/purchase`: record a purchase. Body: `{ "amount": 12.50 }`.
- `POST /api/members/:id/redeem`: redeem points. Body: `{ "points": 10 }`.
- `GET /api/health`: report API and MongoDB connection status.
- `POST /clock`: expire point lots at a supplied ISO timestamp.
- `GET /outbox`: inspect queued Platinum tier-upgrade notifications.
- `GET /api/members/:id/transactions?page=1&limit=10&sortBy=createdAt&order=desc`: return paginated member activity. Sorting supports `createdAt`, `pointsChange`, and `type`.

Successful mutation responses include the updated `member`; errors use `{ "error": "..." }` with a relevant HTTP status.
Member and reward endpoints require `Authorization: Bearer <token>`.

## Important assumptions

The twist rules are centralized in `services/rewardService.js`: Platinum begins at lifetime spend `5000`, earns `0.3` points per currency unit, and unused earned points expire after `90` days. Existing Regular, Silver, and Gold tiers retain their current values; fractional earned points are rounded down. A tier-upgrade notification is written to the outbox when a purchase crosses the Platinum threshold.

Redemption accepts positive whole points. Purchases accept positive numeric amounts. Purchase updates use a tier-aware atomic increment, while redemption uses an atomic `points >= requested` filter so concurrent requests cannot make a balance negative.