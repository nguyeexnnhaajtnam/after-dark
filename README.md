# AFTER DARK

Premium, private two-player card games for couples. The MVP includes a complete **Read My Mind** loop and honest Coming Soon pages for four future games.

## Architecture

- `apps/web` — Next.js App Router, Tailwind, Motion, Zustand, Socket.IO client
- `apps/api` — NestJS REST API and Socket.IO gateway
- `packages/contracts` — shared room/game/event contracts
- PostgreSQL + Prisma — rooms, guest seats, cards, durable game sessions and idempotent actions
- Nginx — same-origin production routing for HTTP and WebSockets

The backend is authoritative. The client submits intentions with action IDs and expected state versions. The server validates membership, seat, phase and turn; its projection removes secret answers, private desire choices, and unannounced missions.

Read My Mind sessions contain exactly 12 primary cards: 5 Mind Reader, 3 Chemistry, 2 Mutual Desire, and 2 Plot Twist cards (one Role Reversal, one Double Spark), opened by a How to Play briefing both players acknowledge. Each player sets a maximum heat in the lobby (1 Sweet · 2 Flirty · 3 Spicy · 4 Daring · 5 Wild); the session never deals above the lower limit.

Scoring: a correct Mind Reader guess earns +1 Spark (doubled by Double Spark). A wrong guess earns nothing and offers an optional forfeit that only happens if both say yes. A Chemistry challenge earns +1 Spark each, only after both consent, start it, and both confirm it really happened. Declining or skipping never costs anything. Mutual Desire awards no Sparks, so nobody is nudged toward yes. Each player gets two private Secret Missions; a partner-confirmed mission awards a Power Card (Double Spark, Second Chance, Role Reversal; inventory limit 2).

## Local development

```bash
corepack enable
pnpm install
copy .env.example .env
copy apps/api/.env.example apps/api/.env
docker compose up -d --force-recreate postgres
pnpm --filter @after-dark/api prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. API health is at `http://localhost:4000/api/v1/health`.

## Production

Set a strong `RECONNECT_TOKEN_PEPPER`, secure PostgreSQL credentials, and the public origin in `.env`, then:

```bash
docker compose up --build -d
```

Nginx exposes the site at `http://localhost` and upgrades `/socket.io/` connections.

## REST API

- `GET /api/v1/health`
- `GET /api/v1/games`
- `GET /api/v1/games/:id`
- `POST /api/v1/rooms`
- `POST /api/v1/rooms/join`
- `GET /api/v1/rooms/:id` with `x-player-id` and `x-reconnect-token`

## Realtime events

Client: `room:authenticate`, `room:ready`, `room:select_game`, `room:set_heat`, `game:start`, `game:action`, `game:return_lobby`.

Server: `room:state`, `room:player_joined`, `room:player_disconnected`, `game:state`.

Every command has an acknowledgement shaped as `{ ok, data }` or `{ ok, error: { code, message } }`.

## Privacy and consent

No account or personal profile is stored. Reconnect credentials are random and stored as hashes. Room codes select rooms but never authenticate a player. Optional challenges can always be declined, questions can be skipped, and skipping carries no score penalty.

Mutual Desire choices are projected only as a submission status and a final mutual unlock boolean. Chemistry requires independent consent followed by independent completion confirmation. Secret Missions are private until their owner declares completion; an opponent can decline confirmation without changing either score.

## Tests

```bash
pnpm --filter @after-dark/api test
pnpm --filter @after-dark/web test
pnpm --filter @after-dark/web build
```

The API suite includes a PostgreSQL-backed two-player session that verifies the exact category mix, persisted actions, mission reward, all 12 rounds, and game completion. Playwright specs in `apps/web/e2e` drive two independent browser contexts through a full session and check layout at 320/375/390/430/tablet/desktop/landscape. Run them against a running stack with `E2E_BASE_URL=http://localhost:3000 npx playwright test` from `apps/web` (`npx playwright install chromium` first). Room creation is rate-limited to 8 per minute, so run the suites a minute apart if you hit "Too Many Requests".
# after-dark
