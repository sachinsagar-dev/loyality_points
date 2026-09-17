# Solution Reasoning

## Problem framing

The product is a café counter workflow, so the first priority was a short path from phone number to a trustworthy balance. The backend owns all calculations and persistence; the browser only submits commands and renders the returned member.

## Design choices

### Simple REST boundary

The API is split into member operations and reward operations. Controllers only translate HTTP input/output. Reward behavior lives in `services/rewardService.js`, which keeps calculations out of both controllers and frontend code.

### Persistence model

`Member` stores `name`, `phone`, `tier`, and `points`, plus Mongoose timestamps. Phone is unique and indexed so lookup remains efficient as the member list grows. Points have a zero default and a non-negative validator.

### Handling unspecified rules

The assessment did not provide earning rates or promotion thresholds. Rather than spreading invented values through the code, the implementation places the current assumptions in `REWARD_RULES` inside the reward service. They can be replaced when the official rules are confirmed.

### Preventing invalid balances

Purchase uses `$inc` after reading the member's current tier. Redemption uses `findOneAndUpdate` with `{ points: { $gte: requested } }` and `$inc: { points: -requested }`. MongoDB evaluates this condition atomically, so two concurrent redemptions cannot both spend the same balance.

### Operational setup

The initial run failed because no MongoDB process was listening on port `27017`. Docker Compose was added so a candidate can start a local MongoDB consistently with `npm run db:up`, without putting credentials in source code.

## Build sequence

1. Initialized the CommonJS Node project and installed Express, Mongoose, and dotenv.
2. Added the database connection, member model, REST routes, controllers, reward service, and error middleware.
3. Added the static staff counter for lookup, purchases, and redemption.
4. Added Docker Compose for local MongoDB persistence.
5. Added member registration so staff can create records without manually calling the API.
6. Added the database-aware health endpoint.
7. Updated the root submission documentation and identified remaining Round 2 gaps: authentication/login, transaction history, and pagination/sorting.
8. Added immutable purchase/redemption transaction records plus a paginated and sorted member history view.
9. Added simple staff registration/login with built-in password hashing and signed expiring bearer tokens.
10. Added a one-page landing/authentication view, authenticated member directory search, and dependency-free automated tests.
11. Added the three twists: Platinum promotion at lifetime spend `5000`, 90-day point lots with deterministic `/clock` expiry, and `/outbox` notifications on tier crossing.

## Testing and fixes

- Ran `npm install`; dependencies installed successfully with no reported vulnerabilities.
- Ran `node --check` across backend modules and `public/script.js`.
- Found and removed a duplicate Mongoose phone-index declaration after startup emitted a duplicate-index warning.
- Validated the Docker Compose configuration with `docker compose config`.
- Started MongoDB and confirmed the Node server connected successfully.
- Smoke-tested `GET /api/health`, member creation, a Silver purchase, and redemption. A 10-unit purchase awarded 12 points at the current Silver multiplier; redeeming 5 left 7 points.
- Removed the temporary smoke-test member from MongoDB.
- Found duplicate Node server processes during testing, stopped them, and reran the test against one clean process.
- Smoke-tested staff registration/login, confirmed unauthenticated member access returns `401`, verified member search pagination/sorting, and confirmed a protected Silver purchase awards 12 points from a 10-unit purchase.
- Ran `npm test`; all four reward/schema tests passed.
- Smoke-tested the twists end to end: a Gold member crossing from `4999` to `5000` became Platinum and produced an outbox event; `/clock` expired 11 points across two test lots and created expiration transactions.

## Known limitations and next work

The current implementation covers the Round 2 mandatory product shape: persistence, REST APIs, usable UI, staff registration/login, search, a landing/authentication page, and pagination/sorting. Production hardening remains: roles, token revocation, password reset, and full MongoDB integration/concurrency tests.

The current implementation covers the Round 2 requirements plus all three twists. Production hardening remains: roles, token revocation, password reset, request validation hardening, audit logging, and full MongoDB integration/concurrency tests.