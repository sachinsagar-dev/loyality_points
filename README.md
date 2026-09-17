# Café Rewards Programme

## Product overview

Café Rewards is a staff-facing rewards counter for café programme members. Staff can register members, find them by phone number, record purchases, and redeem points. The product is aimed at café counter staff who need a small, fast interface backed by persisted member balances.

The application uses a plain HTML/CSS/JavaScript frontend, an Express REST API, and MongoDB through Mongoose. The backend is the source of truth for points and all reward calculations.

## Current feature set

- Member registration with name, unique phone number, and Regular/Silver/Gold tier.
- Efficient phone lookup through a unique MongoDB index.
- Purchase recording with tier-based point calculation.
- Point redemption with validation and an atomic sufficient-balance filter.
- Live balance updates from persisted API responses.
- Duplicate phone, invalid amount, invalid ID, invalid tier, not-found, and insufficient-points errors.
- Database-aware `GET /api/health` endpoint.
- Local MongoDB setup through Docker Compose with persistent storage.
- Responsive staff counter UI using no frontend framework.
- Persistent purchase/redemption activity history with pagination and sorting.
- Staff registration/login with signed expiring bearer tokens and protected operations.
- One-page product landing/authentication entry view.
- Searchable member directory with pagination and sorting.
- Dependency-free automated tests for reward and schema invariants.
- Automatic Platinum promotion at lifetime spend `5000`.
- Deterministic `POST /clock` point expiry and `GET /outbox` tier notifications.

The core Round 2 requirements are now represented in the implementation. Future hardening could add role permissions, richer integration tests, and production session revocation.

## Architecture

```text
cafe-rewards/
├── public/                 Static staff UI
├── models/                 Mongoose member and transaction schemas
├── routes/                 REST route declarations
├── controllers/            Thin HTTP handlers
├── services/rewardService.js Centralized reward rules and balance updates
├── middleware/             Centralized API error handling
├── config/db.js             Mongoose connection
├── server.js                Express application and startup
└── docker-compose.yml       Local MongoDB service
```

Reward rates are intentionally centralized in `services/rewardService.js` because the original business brief did not define rates or tier thresholds.

## Requirements

- Node.js 18 or newer
- Docker Engine/Desktop with Docker Compose, or a hosted MongoDB deployment

## Installation and running

```sh
cd cafe-rewards
npm install
cp .env.example .env
npm run db:up
npm start
```

Open `http://localhost:3000`.

To stop the local database:

```sh
npm run db:down
```

To create the demo dataset of three staff accounts and thirty customers:

```sh
npm run seed
```

The seed command is idempotent. It prints generated staff passwords once; customer phone numbers use the fictional `202-555-0101` through `202-555-0130` range.

The MongoDB data is stored in the named Docker volume `cafe_rewards_mongo_data`. To use hosted MongoDB instead, skip `npm run db:up` and set `MONGO_URI` in `.env`.

## Environment variables

| Variable | Description | Example |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/cafe_rewards` |
| `PORT` | Express HTTP port | `3000` |
| `AUTH_SECRET` | Secret used to sign staff bearer tokens | a long random value |

Never commit `.env`; it is excluded by `.gitignore`. Use `.env.example` as the safe template.

## REST API

### `GET /api/health`

Returns API/database status. Returns `200` when MongoDB is connected and `503` when it is unavailable.

### `POST /clock`

Expires unused point lots at or before the requested time. Body: `{ "now": "2026-12-17T00:00:00.000Z" }`.

### `GET /outbox`

Returns queued tier-upgrade notifications created when a member crosses into Platinum.

### `POST /api/auth/register`

Creates a staff account and returns a signed bearer token. Body: `{ "name": "Ava", "email": "ava@example.com", "password": "password123" }`.

### `POST /api/auth/login`

Authenticates a staff account and returns a signed bearer token. Body: `{ "email": "ava@example.com", "password": "password123" }`.

### `POST /api/members`

Creates a member.

```json
{
	"name": "Ava Patel",
	"phone": "5551234567",
	"tier": "Regular"
}
```

Returns `201` with `{ "member": { ... } }`.

### `GET /api/members/:phone`

Looks up one member by their indexed phone number. Returns `404` if no member exists.

### `GET /api/members?search=&page=1&limit=10&sortBy=name&order=asc`

Returns authenticated staff a searchable member list. Search matches name or phone; supported sort fields are `name`, `phone`, `tier`, `points`, and `createdAt`. `limit` is capped at 50.

### `POST /api/members/:id/purchase`

Records a purchase and returns the updated member.

```json
{ "amount": 12.50 }
```

### `POST /api/members/:id/redeem`

Redeems whole-number points and returns the updated member.

```json
{ "points": 10 }
```

### `GET /api/members/:id/transactions?page=1&limit=10&sortBy=createdAt&order=desc`

Returns the member's persisted purchase and redemption activity. `sortBy` accepts `createdAt`, `pointsChange`, or `type`; `limit` is capped at 50.

Errors consistently use `{ "error": "message" }` with an appropriate HTTP status.

## Reward and consistency decisions

The unspecified rules currently use these centralized defaults:

- Regular multiplier: `1`
- Silver multiplier: `1.25`
- Gold multiplier: `1.5`
- Platinum multiplier: `0.3`
- Platinum threshold: lifetime spend `>= 5000`
- Earned point lots expire after `90` days
- One point per currency unit before the tier multiplier
- Fractional earned points are rounded down
- New members start at zero points
- Tier is assigned at registration; no promotion thresholds are invented
- Redemption requires a positive whole number of points

Purchases use an atomic `$inc`. Redemptions use an atomic update filter requiring `points >= requested`, preventing concurrent requests from producing a negative balance.

## Testing and debugging

Run automated tests:

```sh
npm test
```

Syntax checks for the backend and browser JavaScript:

```sh
node --check server.js
node --check public/script.js
```

Dependency verification:

```sh
npm ls --depth=0
```

API smoke test after starting the app:

```sh
curl http://localhost:3000/api/health
```

If startup reports `ECONNREFUSED 127.0.0.1:27017`, start MongoDB with `npm run db:up`. If port `3000` is already occupied, stop the existing Node process or set another `PORT` in `.env`.

## Next three features

1. Staff roles and permissions for managers versus counter staff.
2. Automated MongoDB integration tests for concurrent redemption and transaction integrity.
3. Password reset and token revocation for production operations.

See [REASONING.md](REASONING.md) for implementation decisions and testing notes. See [AI_LOGS.md](AI_LOGS.md) for the available AI-assisted development transcript.