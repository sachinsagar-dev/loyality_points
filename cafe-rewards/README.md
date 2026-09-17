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

The Compose file stores MongoDB data in the named `cafe_rewards_mongo_data` volume. Stop the database with `npm run db:down`; the volume is retained for the next startup.

For a hosted MongoDB instance, skip `npm run db:up` and set `MONGO_URI` in `.env` to the provider connection string.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/cafe_rewards` |
| `PORT` | HTTP port | `3000` |

## API

- `GET /api/members/:phone`: look up one member by phone number.
- `POST /api/members`: create a member. Body: `{ "name": "Ava", "phone": "5551234567", "tier": "Regular" }`.
- `POST /api/members/:id/purchase`: record a purchase. Body: `{ "amount": 12.50 }`.
- `POST /api/members/:id/redeem`: redeem points. Body: `{ "points": 10 }`.
- `GET /api/health`: report API and MongoDB connection status.
- `GET /api/members/:id/transactions?page=1&limit=10&sortBy=createdAt&order=desc`: return paginated member activity. Sorting supports `createdAt`, `pointsChange`, and `type`.

Successful mutation responses include the updated `member`; errors use `{ "error": "..." }` with a relevant HTTP status.

## Important assumptions

The assessment does not specify earning rates, currency conversion, tier thresholds, promotions, or redemption catalogue rules. Those choices are isolated in `services/rewardService.js`: one point per currency unit, with multipliers of Regular `1`, Silver `1.25`, and Gold `1.5`; fractional results are rounded down. Tier is supplied when a member is created and is not automatically promoted because no thresholds were provided. Confirm and change these values centrally before production use.

Redemption accepts positive whole points. Purchases accept positive numeric amounts. Purchase updates use a tier-aware atomic increment, while redemption uses an atomic `points >= requested` filter so concurrent requests cannot make a balance negative.