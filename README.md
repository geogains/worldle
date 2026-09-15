# Daily Worldle

A daily word-deduction game where **every valid word is a country**. Six attempts, Wordle-style green / yellow / gray feedback, one shared answer per day. No maps, flags, distances or other geography clues: it is a pure letter puzzle played with country names.

The product name is provisional. Every brand string lives in `src/config/branding.ts`.

## Tech stack

- [Vite](https://vite.dev) 8 + [React](https://react.dev) 19 + TypeScript 6
- [Tailwind CSS](https://tailwindcss.com) 4 (CSS-first config, design tokens in `src/styles/index.css`)
- [Vitest](https://vitest.dev) + Testing Library for tests
- [oxlint](https://oxc.rs) for linting
- Playwright (dev only) for the screenshot QA scripts in `qa/`
- No runtime dependencies beyond React and ReactDOM. No backend, no accounts, no analytics.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command                   | What it does                                                   |
| ------------------------- | -------------------------------------------------------------- |
| `npm run build`           | Type-checks (`tsc -b`) and builds to `dist/`                    |
| `npm run preview`         | Serves the production build locally                            |
| `npm run typecheck`       | `tsc -b` only                                                  |
| `npm run lint`            | oxlint over `src/` and `scripts/`                               |
| `npm test`                | Runs the Vitest suite once (`npm run test:watch` for watch mode)|
| `npm run check`           | typecheck + lint + test + build                                 |
| `npm run audit:countries` | Prints the country dataset report (see below)                   |

Visual QA (optional, needs `npx playwright install chromium` once):

```bash
npm run build && npx vite preview --port 4173   # in one terminal
node qa/visual-qa.mjs                           # screenshots -> qa/screenshots/
node qa/flow-qa.mjs                             # rollover / archive / reduced-motion flows
node qa/generate-images.mjs                     # regenerates public/og.png and apple-touch-icon.png
```

## Country dataset

`src/data/countries.ts` holds the canonical 195-country set (193 UN members + Palestine + Vatican City) using practical English names. Each entry is generated as:

```ts
{ id: 'costa-rica', name: 'Costa Rica', normalized: 'COSTARICA', length: 9 }
```

Only the display name is hand-maintained; `id`, `normalized` and `length` are derived.

Naming decisions to be aware of: `Congo` (Republic of the Congo) and `DR Congo`; `Ivory Coast`; `Turkey`; `Czechia`; `Eswatini`; `Cabo Verde`; `Timor-Leste`; `Myanmar`; `North Macedonia`; `Micronesia`; `Bahamas` / `Gambia` without the article; `São Tomé and Príncipe` keeps its diacritics for display.

### Dataset audit

```bash
npm run audit:countries
```

Reports the total count, the eligible daily pool, counts by normalized length, duplicate names/ids, normalization collisions, unexpected characters and broken normalization. It exits non-zero on any problem. The same checks run in `src/data/countries.test.ts`, and the app never depends on the script at runtime.

Current numbers: 195 countries, 167 eligible daily answers (4–10 letters). By length: 4 → 10, 5 → 25, 6 → 30, 7 → 43, 8 → 25, 9 → 13, 10 → 21. Twenty-eight countries of 11+ letters are valid guesses in principle but never answers in V1.

## Normalization rules

`normalizeCountryName` in `src/lib/text/normalize.ts`:

1. strip diacritics (`São Tomé` → `Sao Tome`)
2. uppercase
3. remove every non A–Z character (spaces, hyphens, apostrophes, dots)

So `Costa Rica` → `COSTARICA`, `Timor-Leste` → `TIMORLESTE`. The board for Costa Rica is a plain 9-column board; spaces and punctuation are never shown before the answer is revealed. The proper display name is shown only after the game is complete.

## Game rules and evaluation

- Six rows; column count equals today's normalized answer length (4–10).
- A guess is accepted only if it is a known country **and** its normalized length equals the answer length (`src/lib/game/validate.ts`). Rejected guesses do not consume an attempt.
- Tile evaluation uses the two-pass algorithm with correct duplicate-letter handling (`src/lib/game/evaluate.ts`).
- Keyboard key colours never downgrade: green > yellow > gray > unused (`src/lib/game/keyboard.ts`).

## Daily puzzle algorithm

`src/lib/daily/date.ts` and `src/lib/daily/select.ts`.

- **Daily boundary policy: the UTC calendar date.** Everyone in the world moves to the next puzzle at 00:00 UTC. This keeps the answer identical across devices and time zones; the trade-off is that the reset is not at local midnight. The countdown in the results modal uses the same functions, so the two cannot disagree.
- Puzzle #1 is `EPOCH_UTC` = 2026-09-15. Puzzle number = whole UTC days since the epoch + 1.
- The eligible pool (all 4–10 letter countries, alphabetical) is shuffled with a seeded PRNG (mulberry32, fixed seed). Puzzle *n* takes entry `(n-1) mod poolSize` of cycle `floor((n-1)/poolSize)`; each cycle uses a different seed, so no answer repeats until all 167 have been used, and later cycles are in a different order.
- The selection is a pure function of the puzzle number: no `Math.random`, no network, stable across refreshes.
- **Changing the dataset or the seed changes the schedule.** `src/lib/daily/select.test.ts` snapshots the first ten answers so this can only happen deliberately (update the snapshot with `npx vitest run -u`).

The app checks for the rollover once a second and on tab focus. If the day changes while a game is open, a banner offers the new puzzle rather than swapping the board mid-game.

## Local persistence

`src/lib/storage/storage.ts` wraps localStorage: every key is namespaced and versioned (`daily-worldle:v1:<name>`), falls back to an in-memory store when localStorage is unavailable, and every read goes through a defensive parser in `src/lib/storage/schema.ts` so malformed data can never crash the app.

Keys:

| Key        | Contents                                                        |
| ---------- | --------------------------------------------------------------- |
| `daily`    | Today's puzzle number, submitted guesses, partially typed row    |
| `stats`    | Played, wins, streaks, distribution, completed puzzle numbers    |
| `prefs`    | Theme preference (`system`/`light`/`dark`), tutorial seen flag   |
| `practice` | Current practice answer id, guesses, previous answer id          |
| `archive`  | Replay progress keyed by puzzle number                           |

Bump `STORAGE_VERSION` and add a migration in `schema.ts` when the shape changes.

## Statistics and streaks

`src/lib/stats/stats.ts` is pure and idempotent: `applyDailyResult` ignores a puzzle number that is already in `completedPuzzles`, so reloading a finished game never double-counts. A win extends the streak only when the previous puzzle number was also won; a loss resets it. For display, `getCurrentStreak` returns 0 once a day has been skipped. Only the Daily mode ever calls `recordDailyResult`.

## Game modes

- **Daily** (`/`): the shared puzzle. The only mode that touches statistics.
- **Practice** (`/practice`): a random eligible country, unlimited games, "Play again" avoids repeating the previous answer. Persisted separately so switching modes never disturbs the daily game.
- **Archive** (`/archive`, `/archive/:n`): lists every previous puzzle with its status and lets you replay it. Replay progress is stored per puzzle number; results are labelled "Archive" (including in share text) and never affect stats or streaks. Today's number redirects to Daily; future numbers are refused.

All three modes render the same `GameView` + `useGameEngine`, so the mechanics are identical by construction.

## Architecture

```
src/
  config/branding.ts        product name, description, storage namespace
  data/countries.ts         dataset + lookups;  data/audit.ts  audit logic
  lib/
    text/normalize.ts       normalization
    game/                   evaluate, validate, keyboard state, help examples, types
    daily/                  UTC date policy, seeded PRNG, answer selection
    practice/select.ts      random practice answer
    stats/stats.ts          stats + streak logic
    share/share.ts          share text + Web Share / clipboard
    storage/                localStorage wrapper + schema parsers
    router/routes.ts        path <-> route parsing
  hooks/
    useGameEngine.ts        reducer-based engine: input, validation, reveal timing, completion
    useBoardMetrics.ts      ResizeObserver tile sizing (fits 6 rows x N columns, no scrolling)
    useDailyClock.ts        today's puzzle number + countdown
    use{Prefs,Stats,Toast,Router,Overlays}.ts   context hooks
  providers/                the matching context providers
  components/
    game/                   Board, Row, Tile, GameView, ShareButton, PostGameSlot
    keyboard/Keyboard.tsx   on-screen QWERTY keyboard
    modals/                 HelpModal, ResultModal (practice/archive)
    stats/                  StatsModal, Distribution, Countdown
    layout/                 Header (nav + menu), RolloverBanner
    toast/ToastStack.tsx
    ui/                     Modal (focus trap, Escape, restore), icons
  screens/                  Daily, Practice, Archive, ArchiveGame, NotFound
  styles/index.css          Tailwind import, design tokens, tile/keyboard styles, keyframes
scripts/audit-countries.ts  dataset audit CLI
qa/                         Playwright screenshot / flow scripts (screenshots are gitignored)
```

Routing is a tiny History-API router (`providers/RouterProvider.tsx`); `vercel.json` rewrites every path to `index.html`.

Animations are CSS keyframes driven by classes and `--i` (column index) custom properties: letter pop, row shake, staggered 3D flip (colour switches at the half-turn), win bounce, modal/toast transitions. `prefers-reduced-motion` swaps the flip for a short fade and disables pop/shake/bounce; the engine also uses shorter timings.

## Accessibility

Semantic buttons everywhere, visible `:focus-visible` rings, `aria-label`s on icon controls and keys (including discovered state), a focus-trapped `role="dialog"` with Escape and focus restoration, tiles labelled with letter + status after reveal, and a single polite live region that announces each revealed row.

## Deployment (Vercel)

No backend or environment variables are required.

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, "Add New Project", import the repo. Vercel detects Vite: build command `npm run build`, output `dist`.
3. Deploy. `vercel.json` provides the SPA fallback so `/practice` and `/archive/12` load directly.
4. Set `siteUrl` in `src/config/branding.ts` to the final domain so canonical / Open Graph URLs are correct.

Or with the CLI: `npx vercel` (preview) and `npx vercel --prod`.

## V2 extension points

- **Country information card** (flag, capital, continent, fact): `components/game/PostGameSlot.tsx` is rendered inside every results modal after the answer is known and currently returns `null`. Add per-country metadata to the dataset and render it there.
- **GeoRanks banner**: same slot, or a sibling below `GameView` in `screens/*`.
- **11+ letter puzzles**: raise `MAX_ANSWER_LENGTH` in `data/countries.ts`; `useBoardMetrics` already scales tiles. Note this changes the daily schedule (see snapshot test).
- **Themes / high contrast**: all colours are tokens in `styles/index.css` under `[data-theme=...]`; add another attribute value.
- **Analytics / cloud sync / accounts**: `providers/StatsProvider.tsx` and `lib/storage/schema.ts` are the only places stats are written; wrap them.
