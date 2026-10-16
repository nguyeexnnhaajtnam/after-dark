# AFTER DARK

Premium, private two-player card games for couples. The MVP includes a complete **Read My Mind** loop and honest Coming Soon pages for four future games.

## Architecture

- `apps/web` — Next.js App Router, Tailwind, Motion, Zustand, Socket.IO client
- `apps/api` — NestJS REST API and Socket.IO gateway
- `packages/contracts` — shared room/game/event contracts
- PostgreSQL + Prisma — rooms, guest seats, cards, durable game sessions and idempotent actions
- Nginx — same-origin production routing for HTTP and WebSockets

The backend is authoritative. The client submits intentions with action IDs and expected state versions. The server validates membership, seat, phase and turn; its projection removes secret answers, private desire choices, and unannounced missions.

Read My Mind sessions contain exactly 12 primary cards: 5 Mind Reader, 3 Chemistry, 2 Mutual Desire, and 2 Plot Twist cards (two different effects out of Role Reversal, Double Challenge, Counter Mind and One More Question, each modifying only the next Mind Reader card), opened by a How to Play briefing that is reading only: the host draws the first card from it. Every new card is drawn in turns (host odd cards, partner even ones; the partner draws instead while the drawer is offline) with one tap that replaces the old Next button; the projection's `nextStep`/`nextDrawerId` say what `NEXT_ROUND` does next. A Chemistry challenge starts the moment both choose to take part. Each player sets a maximum heat in the lobby (1 Sweet · 2 Flirty · 3 Spicy · 4 Daring · 5 Wild); the session never deals above the lower limit.

Scoring: the game is not a contest. A correct Mind Reader prediction earns +1 Spark; nothing multiplies it, and twists and Power Cards never award Spark. Predictions are counted by category with their own denominators: NORMAL (scheduled, unaided), EXTRA (Double Challenge part B, which asks a second, different question), RECIPROCAL (both Counter Mind predictions) and HINTED (after a One More Question answer). Every prediction is kept raw (round, card, question, part, twist, players, outcome, category); no compatibility formula has been approved, so none is computed. Sessions record their ruleset and each dealt twist's effect; a session from an older ruleset is closed rather than reinterpreted. A wrong guess earns nothing; the player who missed draws a forfeit face down (up to three cards spread, the partner watches) and it only happens if both say yes. A Chemistry challenge earns +1 Spark each, only after both choose to take part (which starts it, with one server-stamped clock) and both confirm it really happened. Declining or skipping never costs anything. Mutual Desire awards no Sparks, so nobody is nudged toward yes. Each player draws two private Secret Missions, one at a time, from their own face-down deck; a partner-confirmed mission earns a Power Card draw among the kinds they do not hold (Picky Kitty, Let Me In!, A Little Present; inventory limit 2). Draws send only the spread size to the phones (`DRAW_CARD` with the tapped position); the server deals the card at draw time.

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
