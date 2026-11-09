# Release validation — Worlds Fantasy 1.0

## Passed

- 24 automated tests.
- Exact corrected rosters: Wille, Johan and CG; 15 distinct players, with professional-team and role verification.
- Formula reference examples, duration conversion/multiplication, separate gold caps, negative scores, lambda and invalid input rejection.
- Opponent matching, duplicate/incomplete game rejection, tournament/date filtering and player identity resolution.
- All 15 final player cumulative values match their full-precision totals.
- Each fantasy team's last cumulative graph point matches its leaderboard total to floating-point tolerance.
- Multiple drafted players in a single game update team history atomically, with no partial-game intermediate points. Negative scores decrease cumulative totals; inactive teams stay flat.
- Simulated DOM interaction checks: team chart mode, search, team/role filters, empty state/reset, player selection, spotlight update, match-log filtering, pagination and cumulative player mode.
- CSV export contains all 148 drafted appearances; its independently summed totals match standings. JSON export matches the dashboard API.
- Strict TypeScript checks.
- Next.js production build, including static homepage prerender and all API routes.
- Production HTTP checks: dashboard HTML and corrected roster totals, historical data, CSV/JSON export responses, Viper detail, favicon and traced CSV deployment assets for all data-reading routes.
- Build-time refresh without a configured URL correctly uses the bundled snapshot.

## Actual release data

99 complete source games; 48 matches featuring drafted players; 148 drafted player appearances. All games in the imported WLDs 2026 snapshot count. Team Johan: 820.6846140211845; Team Wille: 699.7157479443135; Team CG: 685.7139705414022.

## Verification limits

- Visual browser QA was unavailable: the browser could not reach the execution environment's local server during the earlier preview check. DOM interactions and production HTTP output were tested instead; no rendered-browser screenshot or device visual audit is claimed.
- No authenticated Vercel account deployment was performed. The source is configured and build-tested for Next.js deployment on Vercel.
- No working unattended Oracle's Elixir download was established. Manual CSV replacement is verified; optional build-time URL refresh code is included but has no preconfigured or verified remote source.
- A bundled snapshot cannot include later games until it is refreshed and redeployed. No later match statistics were invented.

## Automatic update release 1.1

- 32 automated tests passed, including Stockholm calendar/DST scheduling, morning gate, failed-update cooldown, crashed-job lease recovery, snapshot validation/compression, successful-day deduplication, concurrent visitor suppression, failed-import preservation, unchanged-source checks, CSV/HTML/HTTP/schema/regression validation, and refresh authentication/origin protection.
- Existing scoring, cumulative totals, corrected rosters, exports and simulated UI interactions continue to pass.
- Strict TypeScript checks and Next.js production build pass with a dynamic homepage and runtime data endpoints.
- Production HTTP checks confirm contribution percentages, the fallback dashboard, honest setup-required status, same-origin configuration responses, cross-origin rejection and packaged fallback CSV tracing.
- Redis behavior was exercised through the sync-store contract with injected storage. No user-owned cloud Redis instance or Vercel deployment was configured in this session.
- Live Oracle download verification remains BLOCKED: automatic approval review rejected reading the separate linked Google Drive origin. No direct source URL is preconfigured, no daily source fetch has been activated, and no successful live scrape is claimed.
- The packaged application contains the completed refresh mechanics and deployment setup instructions. Public Drive read approval and server-side storage/source/cron configuration are needed to activate and verify the live connection.
