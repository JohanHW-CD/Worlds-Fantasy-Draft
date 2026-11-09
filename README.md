# Worlds Fantasy

A complete one-page League of Legends fantasy draft dashboard for Wille, Johan and CG. Next.js + TypeScript, ready for Vercel. Real Oracle's Elixir statistics are bundled as a fallback. Automatic runtime updates use persistent Redis storage and a configured CSV source.

## Automatic updates (1.1)

Implemented: a protected daily Vercel cron, morning visit refresh, distributed download lock, durable last-successful snapshot, retry cooldown, freshness/error status, and live reads across the page and all APIs. Successful refreshes take effect without rebuilding or redeploying the website.

**Live-source verification is blocked, not complete.** Oracle's official downloads page links to a public Google Drive folder. Automatic approval review rejected reading that separate origin in this session. No direct CSV URL is guessed or preconfigured. The application correctly shows saved data / setup required until an approved CSV download URL and storage credentials are configured.

### One-time Vercel setup

1. Connect an **Upstash Redis** database through Vercel Marketplace.
2. Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Marketplace `KV_REST_API_URL` and `KV_REST_API_TOKEN` aliases also work.
3. Set `ORACLES_CSV_URL` to the approved, working **direct HTTPS CSV download**. Folder and preview links are rejected. Source access needs to be verified before this can be supplied.
4. Set `CRON_SECRET` to a long random value in Vercel. Do not expose it with a `NEXT_PUBLIC_` prefix. Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Redeploy once to apply the environment variables and cron registration.

See `.env.example` for variable names. No credentials are included in this archive.

### Refresh behavior

- `vercel.json` calls `GET /api/refresh` once daily at **06:00 UTC**. Vercel sends `Authorization: Bearer <CRON_SECRET>`. This is 07:00 in Stockholm in winter and 08:00 in summer; Hobby cron execution can occur within that hour.
- The first page opening or return to a visible tab also calls same-origin `POST /api/refresh`. The server will fetch only from **06:00 Europe/Stockholm** onwards, and only if no successful check has run on that Stockholm calendar day.
- A Redis lock prevents simultaneous downloads by multiple visitors/functions. The lease expires after three minutes so a crashed worker can recover.
- Failed downloads retry at most once per hour on subsequent visits. Scheduled and visit-triggered checks share the same lock and state.
- The full CSV is downloaded only on a due refresh. It is validated, filtered to this tournament, normalized and compressed before storage. Historical games cannot silently disappear. Every drafted identity must resolve.
- Publication is atomic. HTML, login pages, incomplete data, HTTP errors and source regressions preserve the previous successful dataset. The page shows the error and its last-successful timestamp.
- All data endpoints read the same persistent snapshot. If storage itself cannot be reached, the bundled fallback is clearly labelled; inaccessible live scores are never presented as fresh.
- The initial page renders saved scores immediately. While a refresh runs, the client shows progress, polls for completion and refreshes the displayed data.

This is application scheduling on Vercel, not a separate ChatGPT reminder. No schedule has been activated on a user-owned Vercel account in this session.

## What the page does

- Ranked standings for all three corrected fantasy rosters, with each player's points, percentage contribution and contribution bar.
- Interactive cumulative team graphs and per-match team gains, with team toggles, hover inspection and a keyboard-accessible position slider.
- A performance chart for each of the 15 drafted players. Switch between per-game points and cumulative points; search and filter by role or fantasy team.
- Player spotlight with average, best score, wins and a larger graph.
- Paginated, filterable match history: champion, KDA, CS difference, match length, result and expandable scoring calculations.
- CSV and JSON downloads of all scored appearances.
- Source coverage, retrieval date and honest snapshot status. Negative points count. No objectives or teamfight term.

## Start locally

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Deploy on Vercel

1. Unzip the project and run the commands above to check it locally.
2. Put the contents of the `fantasy-worlds` folder in your Git repository.
3. Import that repository into Vercel. Select **Next.js** and use this folder as the Root Directory if it is nested in the repository.
4. Keep the framework's default output directory. `vercel.json` sets `npm ci` and `npm run build`.
5. Deploy. Included fallback data works without environment variables; configure automatic updates as described above.

Alternatively, from this project directory:

```sh
npx vercel --prod
```

The CLI will ask you to sign in to your own Vercel account and select a project. This source bundle has not itself been deployed to a Vercel account.

## Data included

The verified Oracle's Elixir CSV snapshot contains 99 complete games labelled `WLDs`, year 2026. All available imported Worlds games count, including games before the draft; no draft cutoff was specified.

The 15 drafted players appear in **48 distinct matches**, producing **148 individual player-game scores**. These are different counts: a match can contain several drafted players. Raw source rows for their opponents are included, so CS/gold comparisons are calculated from actual data.

Source timestamps run from September 17 through November 7, 2026. Snapshot retrieved November 7. This is a downloaded dataset, not a live feed or a promise of games beyond that snapshot. See `docs/source-audit.md` for provenance and field mappings.

### Corrected rosters

| Team | Top | Jungle | Mid | Support | Bottom |
| --- | --- | --- | --- | --- | --- |
| Wille | Bin | Oner | Chovy | ON | Ruler |
| Johan | Doran | Canyon | Knight | Keria | Viper |
| CG | Kiin | Lucid | Faker | Career | Caliste |

Names and professional teams were verified against the source, including Viper at BLG and Career at DK. Edit `data/config.json` to change a roster, date window or gold weight.

## Update with a new Oracle's Elixir CSV

Download the current official CSV through https://oracleselixir.com/tools/downloads. The official page says data updates once per day.

```sh
npm run import:csv -- /path/to/official.csv
npm run import:csv -- /path/to/official.csv --write
npm run build
```

The first command is a dry run. `--write` validates the data and replaces the local filtered snapshot and provenance. It refuses empty or invalid imports. Review the updated files, then commit and redeploy to make the new scores visible to friends. The page itself does not accept uploads or write to Vercel's filesystem.

The importer normalizes all players in each eligible game before selecting drafted players. Re-running an import replaces the dataset; it never appends duplicate points. Missing required values reject the game rather than becoming zero. Source corrections are recalculated from the replacement snapshot.

The snapshot-specific test currently expects 99 games / 148 drafted appearances. Review and update those coverage expectations when accepting a newer official dataset. Scoring and cumulative consistency tests should not need changes.

### Optional local download command

With `ORACLES_CSV_URL` configured locally, `npm run refresh` downloads and validates a replacement bundled CSV. This convenience command is separate from the runtime updater. Production builds do not download the annual CSV; cron and morning refreshes update Redis after deployment.

## Scoring

```text
exp((33 - durationMinutes)/33) * (
  1.5*kills + assists - 0.5*deaths + csDifference/20
  + lambda*(min(playerGold,20000)-min(opponentGold,20000))/1000
  + 2*win
)
```

Lambda defaults to 1. CS/gold use final totals against the opposing same-role player. Each player's gold is capped separately. Duration is converted from source seconds to fractional minutes. Scores are calculated per game, then summed. Full precision is retained; display rounding is two decimals. Professional team objectives, teamfights, and a separately drafted team score are excluded.

Naive source timestamps are treated as UTC for consistent ordering; the original raw timestamp strings are preserved in CSV. This timezone assumption matters if you configure an exact date cutoff. Current scope has no cutoff.

## APIs

- `POST /api/refresh`: same-origin daily freshness check; no secret is exposed to the browser and no client-selected download URL is accepted.
- `GET /api/refresh`: cron-only refresh requiring the configured bearer secret.
- `GET /api/dashboard`: corrected rosters, ranked scores, team history, all drafted player histories, normalized appearances with full scoring breakdowns, provenance and coverage.
- `GET /api/leaderboard`: standings, player catalog and source status.
- `GET /api/players?name=Canyon`: player games and breakdowns. Accepts a stable source ID or configured alias; omit `name` for the source player catalog.
- `GET /api/export`: downloadable CSV with all drafted player-game statistics and score components.
- `GET /api/export?format=json`: downloadable full dashboard data.
- `POST /api/score`: stateless scoring. Body shape: `{ "stats": { "durationMinutes":33,"kills":4,"assists":6,"deaths":2,"csDifference":20,"playerGold":15000,"opponentGold":13000,"win":1 }, "lambda":1 }`. This example scores 16 points.

Automatic data lives in Redis, not the Vercel filesystem. The bundled CSV is a read-only fallback. File tracing includes that fallback in server functions. Only the refresh flow writes validated snapshots; public read endpoints never fetch the annual source file.

## Code map

- `src/lib/scoring.ts`: pure validated scoring.
- `src/lib/importer.ts`: source validation, filters and opponent pairing.
- `src/lib/analytics.ts`: atomic per-match cumulative totals and player histories.
- `src/lib/data.ts`: bundled snapshot adapter.
- `src/lib/live.ts`: shared persistent data reads and runtime refresh wiring.
- `src/lib/sync/`: daily policy, download validation, compression, distributed lease and atomic storage.
- `src/components/Dashboard.tsx`: dashboard interactions.
- `src/components/Chart.tsx`: responsive SVG charts, pointer and keyboard inspection.
- `scripts/import-csv.ts`: local dataset replacement.
- `scripts/refresh-data.ts`: optional local CSV download.
- `docs/standings-snapshot.json`: full unrounded data used for this release.

Data: Tim Sevenhuysen / Oracle's Elixir. Game statistics belong to Riot Games. Consult the source page's terms. This project is not affiliated with Riot Games.
