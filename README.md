# Daily Worldle

A country-based daily word deduction game with familiar tile-feedback mechanics and an original GeoRanks-inspired visual system. Six attempts, one shared answer per day, every valid word a country. No maps, flags, distances or other geography clues: it is a pure letter puzzle played with country names.

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
| `npm run audit:flags`     | Prints the country -> flag mapping coverage report (see below)  |

Visual QA (optional, needs `npx playwright install chromium` once):

```bash
npm run build && npx vite preview --port 4173   # in one terminal
node qa/visual-qa.mjs                           # screenshots -> qa/screenshots/
node qa/flow-qa.mjs                             # rollover / archive / reduced-motion flows
node qa/polish-qa.mjs                           # modal surfaces, tile lettering, mode bar across widths/themes
node qa/logo-qa.mjs                             # header wordmark image: fit, overflow, dark-mode fallback
node qa/theme-toggle-qa.mjs                     # theme switch: state, persistence, a11y, reduced motion, header fit
node qa/help-modal-qa.mjs                       # How to Play: 9-tile examples fit at every width, both themes
node qa/logo-theme-qa.mjs                       # header logo swaps light/dark asset immediately, no layout shift
node qa/nav-underline-qa.mjs                    # nav underline tracks the active route, animates, no pill remnants
node qa/nav-drawer-qa.mjs                       # navigation drawer: sizing, scroll lock, focus trap, animation, themes
node qa/country-results-qa.mjs                  # country results pages: Practice/Daily -> /results/tanzania, card, refresh, a11y, widths, themes
node qa/generate-images.mjs                     # regenerates public/og.png and apple-touch-icon.png
```

## Country dataset

`src/data/countries.ts` holds the canonical 200-entry set (193 UN members + Palestine + Vatican City + Taiwan + Kosovo + England + Scotland + Wales) using practical English names. England, Scotland and Wales are constituent countries of the United Kingdom rather than sovereign ISO 3166-1 states; "United Kingdom" itself remains a separate, distinct (non-playable, guess-only) entry. Each entry is generated as:

```ts
{ id: 'costa-rica', name: 'Costa Rica', normalized: 'COSTARICA', length: 9 }
```

Only the display name is hand-maintained; `id`, `normalized` and `length` are derived.

Naming decisions to be aware of: `Congo` (Republic of the Congo) and `DR Congo`; `Ivory Coast`; `Turkey`; `Czechia`; `Eswatini`; `Cabo Verde`; `Timor-Leste`; `Myanmar`; `North Macedonia`; `Micronesia`; `Bahamas` / `Gambia` without the article; `São Tomé and Príncipe` keeps its diacritics for display; `Taiwan` is included with no political qualifier and is handled identically to every other entry.

### Dataset audit

```bash
npm run audit:countries
```

Reports the total count, the eligible daily pool, counts by normalized length, duplicate names/ids, normalization collisions, unexpected characters and broken normalization. It exits non-zero on any problem. The same checks run in `src/data/countries.test.ts`, and the app never depends on the script at runtime.

### Flag mapping audit

```bash
npm run audit:flags
```

Reports gameplay countries vs. `COUNTRY_CODES` (`data/countryDetails/flags.ts`) vs. actual files in `public/flags/`: missing mappings, mapping keys that aren't real countries, malformed codes, and mapped codes with no on-disk asset. Exits non-zero on any of those. The pure comparison logic (`data/countryDetails/audit.ts`) is unit-tested with synthetic data in `src/data/countryDetails/audit.test.ts`; the mapping-only checks against the real dataset run in `src/data/countryDetails/flags.test.ts`, and the filesystem-backed checks against the real `public/flags/` directory run in `scripts/audit-flags.test.ts` (outside `src/`, since reading the filesystem needs Node types the browser-only `src` tsconfig excludes). Currently all 200 countries are mapped. Most mapping values are plain ISO 3166-1 alpha-2 codes, but a few are not: Kosovo maps to `XK` — not an official ISO 3166-1 code (ISO has never assigned Kosovo one), but the user-assigned code the actual asset in `public/flags/XK.png` uses, and the de facto standard elsewhere (EU, SWIFT, most flag-icon sets) — and England/Scotland/Wales map to the real ISO 3166-2 subdivision codes `GB-ENG`/`GB-SCT`/`GB-WLS` (constituent countries of the United Kingdom have no ISO 3166-1 code of their own, and deliberately do not share the United Kingdom's own `GB` mapping).

Current numbers: 200 countries, 172 eligible daily answers (4–10 letters). By length: 4 → 10, 5 → 26, 6 → 32, 7 → 44, 8 → 26, 9 → 13, 10 → 21. Twenty-eight countries of 11+ letters (including "United Kingdom") are valid guesses in principle but never answers in V1.

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
- The eligible pool (all 4–10 letter countries, alphabetical) is shuffled with a seeded PRNG (mulberry32, fixed seed). Puzzle *n* takes entry `(n-1) mod poolSize` of cycle `floor((n-1)/poolSize)`; each cycle uses a different seed, so no answer repeats until the whole pool has been used, and later cycles are in a different order.
- The selection is a pure function of the puzzle number: no `Math.random`, no network, stable across refreshes.
- **Growing the dataset does not reshuffle history.** Naively re-deriving the shuffle from a longer pool would silently reassign every puzzle, including ones already played — Fisher-Yates draws one PRNG value per array index, so a different pool length produces an unrelated permutation throughout, not an extension of the old one. `select.ts` instead freezes the eligible pool's id order as it stood at 167 entries (before Taiwan) as a permanent historical block; puzzles 1–167 are shuffled from that frozen block forever, and puzzle 168 onward is shuffled from the current full pool (167 + Taiwan + Kosovo + England + Scotland + Wales = 172) as its own independent cycle. A test (`src/lib/daily/select.test.ts`) pins the exact pre-Taiwan schedule as a regression guard. One consequence: because the tail's first cycle is a fresh, independent shuffle, a country can in principle reappear sooner than a full pool-length gap right at that one seam (puzzle 168 vs puzzle 1) — an accepted, self-correcting one-time cost of never reshuffling history. To add another eligible country later without disturbing puzzles already reached in the tail, follow the same pattern: take a fresh id-order snapshot of the pool at that time as the new frozen block before adding the country.
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
| `lastResult` | Pointer (source, country id, puzzle number) to the completed game the player last carried into `/results/:slug` |
| `archive`  | Replay progress keyed by puzzle number                           |

Bump `STORAGE_VERSION` and add a migration in `schema.ts` when the shape changes.

## Statistics and streaks

`src/lib/stats/stats.ts` is pure and idempotent: `applyDailyResult` ignores a puzzle number that is already in `completedPuzzles`, so reloading a finished game never double-counts. A win extends the streak only when the previous puzzle number was also won; a loss resets it. For display, `getCurrentStreak` returns 0 once a day has been skipped. Only the Daily mode ever calls `recordDailyResult`.

## Game modes

- **Daily** (`/`): the shared puzzle. The only mode that touches statistics.
- **Practice** (`/practice`): a random eligible country, unlimited games, "Play again" avoids repeating the previous answer. Persisted separately so switching modes never disturbs the daily game.
- **Country results** (`/results/:slug`, e.g. `/results/tanzania`): a real route reached when a Daily or Practice game ends (after the final reveal/celebration) and from the completed-game **Results** button. The completed board and keyboard are rendered beneath a country card (flag, name, "Solved in n/6", fact grid, "Did you know?", Play again / Share). Closing the card keeps the URL; **Results** reopens it. The header **Statistics** control is the only way into the stats modal. Visiting a results URL with no matching completed game shows the country page standalone with no performance data; an unknown slug shows a not-found page. Slugs are `Country.id` (`lib/country/slug.ts`), never the board normalization.
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
    practice/session.ts     create/restore a practice game (shared "Play again" path)
    country/slug.ts         public country slug (= Country.id) for /results URLs
    results/context.ts      resolves which completed game backs /results/:slug (never fabricates)
    results/format.ts       "Solved in 4/6" / source labels
    results/meta.ts         per-country page title/description
    stats/stats.ts          stats + streak logic
    share/share.ts          share text + Web Share / clipboard
    storage/                localStorage wrapper + schema parsers
    router/routes.ts        path <-> route parsing
  hooks/
    useGameEngine.ts        reducer-based engine: input, validation, reveal timing, completion
    useBoardMetrics.ts      ResizeObserver tile sizing (fits 6 rows x N columns, no scrolling)
    useDailyClock.ts        today's puzzle number + countdown
    use{Prefs,Stats,Toast,Router,Overlays}.ts   context hooks
    useScrollLock.ts        locks page scroll while a value (e.g. the drawer) is open
  providers/                the matching context providers
  components/
    game/                   Board, Row, Tile, GameView, ShareButton, PostGameSlot
    keyboard/Keyboard.tsx   on-screen QWERTY keyboard
    modals/                 HelpModal, ResultModal (archive replays only)
    results/                CountryResultCard (presentational), CountryResultOverlay (Modal wrapper)
    stats/                  StatsModal, Distribution, Countdown
    layout/                 Header (desktop nav + underline), NavigationDrawer (left-side sliding menu), ThemeToggle, RolloverBanner
    toast/ToastStack.tsx
    ui/                     Modal (focus trap, Escape, restore), icons
  screens/                  Daily, Practice, Archive, ArchiveGame, CountryResult, NotFound
  data/countryDetails/      per-country results metadata: flag code map, facts records, placeholder resolver
  styles/index.css          Tailwind import, design tokens, tile/keyboard styles, keyframes
scripts/audit-countries.ts  dataset audit CLI
scripts/audit-flags.ts      country -> flag mapping audit CLI
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

- **Country information** (flag, capital, continent, currency, languages, fact): lives on `/results/:slug` (`screens/CountryResultScreen.tsx`, `components/results/`). Data comes from `data/countryDetails/`: flags are fully mapped (200/200 — see the flag mapping audit above); facts are fully populated (`countryRecords.ts`) for every one of the 172 playable answer-pool countries, plus Tanzania (the original populated country-data-layer test case) — every other canonical, non-playable country (e.g. "United Kingdom") still resolves to "Coming soon" placeholders. Add a record to `countryRecords.ts` to populate a country's facts. `components/game/PostGameSlot.tsx` remains an empty slot inside the Statistics/Archive modals for other post-game content.
- **GeoRanks banner**: same slot, or a sibling below `GameView` in `screens/*`.
- **11+ letter puzzles**: raise `MAX_ANSWER_LENGTH` in `data/countries.ts`; `useBoardMetrics` already scales tiles. Note this changes the daily schedule (see snapshot test).
- **Themes / high contrast**: all colours are tokens in `styles/index.css` under `[data-theme=...]`; add another attribute value.
- **Analytics / cloud sync / accounts**: `providers/StatsProvider.tsx` and `lib/storage/schema.ts` are the only places stats are written; wrap them.
