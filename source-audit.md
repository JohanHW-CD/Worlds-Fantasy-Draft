# Oracle's Elixir source audit

Inspected November 7, 2026. This report describes the actual downloaded file, not a guessed API.

## Verified access and update mechanism

- Official page: https://oracleselixir.com/tools/downloads
- Public folder linked by that page: https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH
- File: `2026_LoL_esports_match_data_from_OraclesElixir.csv` (79,313,916 bytes at retrieval).
- The page states files update once per day, with no value in downloading more often.
- The main page returned HTTP 403 through the research fetcher; the browser could access it and download the public CSV without signing in. Automated unattended download access has NOT yet been proven.
- Do not invent a direct download URL or file ID. The verified folder is the discovery route. Use the local official CSV until a stable automated download has been verified.
- The complete source SHA-256 and retrieval timestamp are in `data/source-audit.json`. The included CSV is a filtered subset; the hash refers to the original complete downloaded file.

## Actual scope and completeness

Exact filter: `league == "WLDs"` and `year == 2026`.

- 1,188 rows across 99 game IDs.
- Every game has 12 rows: 10 individual players and 2 professional-team aggregate rows.
- 990 individual appearances. Roles: top, jng, mid, bot, sup; 198 rows per role.
- All 1,188 rows report datacompleteness `complete`.
- First source game timestamp: 2026-09-17 09:11:42. Last: 2026-11-07 01:06:38.
- 107 distinct display names appear. No assertion that these all belong to a particular bracket or draft period; confirm the intended eligibility window.
- Professional-team aggregate rows are excluded from scoring.

## Field mapping

| Formula/input | Actual CSV field | Handling |
| --- | --- | --- |
| T | gamelength | Seconds / 60. Verified against cspm across all 990 player rows. |
| K | kills | Required nonnegative integer. |
| A | assists | Required nonnegative integer. |
| D | deaths | Required nonnegative integer. |
| C | total cs, opponent total cs | Final totals, own minus opponent. |
| G | totalgold | Final total earned from all sources. Cap at 20,000. |
| G opponent | Opponent row totalgold | Cap separately at 20,000. |
| W | result | 0 or 1; opponents must have complementary values. |
| Identity | playerid, playername | Stable source ID; exact case-insensitive name or explicit alias. |
| Opponent | gameid, side, position | Same scoped game, opposite side, matching role. |
| Scope | league, year, date | Explicit tournament scope and optional date window. |
| Data validity | datacompleteness | Must be complete; required fields also validated. |

`total cs` is populated for every selected player row. For all selected players, `(minionkills + monsterkills) / (gamelength/60)` agrees with cspm to within 0.00005 (the displayed rounding precision). This confirms the duration conversion. All five roles use the same pairing rule.

The older data dictionary uses older names and minute units; do not implement against it. Current-page Definitions link: https://oracleselixir.com/definitions (not required to obtain these field names, which came from the real CSV).

## Worked example

See `worked-example.json`: TheShy in game `13506-13506_game_1`, paired with the opposing top laner. It includes normalized input and every scoring component. The integration test independently calculates the expected result from the raw source rows.

## Deployment and refresh status

The finished dashboard includes the three corrected fantasy rosters (15 distinct players), 148 scored appearances across 48 source matches, player graphs, cumulative team history, match calculations and downloadable exports.

All games in the WLDs 2026 snapshot count, as requested. The full source has 99 complete games; not every source game contains a drafted player.

The bundled snapshot is deployable on Vercel without a database or credentials. Local CSV replacement and redeployment are supported. The runtime updater can fetch a configured direct CSV URL, publish a validated snapshot to Redis and refresh the page without redeployment. A daily Vercel cron and morning visit trigger are implemented. No working direct Oracle's Elixir download URL has been established because automatic approval review rejected reading the linked Google Drive origin. Source fetching returned HTTP 403 through the research fetcher. An earlier browser approval rejected reopening the linked Google Drive folder as a separately unauthorized origin; no bypass was attempted.

The dashboard clearly identifies the data as a snapshot. It does not invent newer matches or hand-enter unverified statistics. A Vercel account deployment must be performed separately with the user's account.
