# Automatic update implementation

The live data connection remains pending public Google Drive access approval and deployment storage setup. The mechanics below are implemented and tested with injected data and storage, not claimed as a verified live Oracle scrape.

## Data flow

1. Cron or a same-origin page visit asks for a freshness check.
2. The server reads sync state from Redis and evaluates the Stockholm calendar day and 06:00 morning boundary.
3. A distributed three-minute lease permits one source download.
4. The download must return actual CSV, resolve the scoped tournament and all drafted players, and preserve every previously scored appearance.
5. Valid normalized statistics are compressed and atomically published with the new sync state only while the lease is still owned.
6. Runtime page, player, standings and export endpoints all read that same snapshot and calculate scores from raw statistics.
7. The browser refreshes the display after successful publication. Failed imports retain the previous successful snapshot; failed storage reads explicitly show the bundled fallback instead.

A successful unchanged file still counts as the day's source check. Failed downloads have a one-hour retry cooldown; a crashed running job can retry when its lease expires. Public visitors cannot force repeated downloads, supply arbitrary URLs, or replace source data.

## Production configuration

- Upstash Redis REST URL and token (or Vercel KV aliases).
- Approved direct source CSV URL.
- A secret for Vercel cron authentication.

All are server-side environment variables. A fallback-only deployment renders correctly but states that automatic updates are not connected. No local filesystem write is used for durable production data.

## Schedule

Vercel cron: `0 6 * * *` (UTC). The morning visit trigger accepts an overdue check after 06:00 Europe/Stockholm, including DST transitions. A failed scheduled update can recover through a later visit.

## Current external blocker

The official Oracle's Elixir page exposes its CSV collection through a linked Google Drive folder. Automatic approval review denied observation of that separate origin. No workaround or guessed direct file URL was used. Approval to read that public folder and its CSV download links is required to complete and verify source discovery.
