# Scoring contract — v1

Per player, per completed game:

`exp((33 - durationMinutes)/33) * (1.5*kills + assists - 0.5*deaths + csDifference/20 + lambda*(min(playerGold,20000)-min(opponentGold,20000))/1000 + 2*win)`

- Lambda defaults to 1. No objectives, teamfight term, or separate professional-team score.
- Convert source duration from seconds to fractional minutes; do not round.
- CS difference means final total CS minus opposing same-role player's final total CS. This applies to all five roles, including jungle and support.
- Use total gold earned, not earnedgold (which excludes passive/starting gold), current unspent gold, or gold spent. Cap each player's total independently at 20,000, then subtract.
- Win is 1 for a win, 0 for a loss. Losing games and negative scores count.
- Sum individual game scores; never apply the formula to tournament-wide averages or totals. Sum drafted player totals for fantasy team standings. Round for display only.
- Shared ranks for numerically equal unrounded totals; alphabetical order for presentation only.
- Required missing values reject the entire game. Never turn a missing field into zero. A duplicate row, role, or identity also rejects the game.
- Explicit user rosters are configured for Wille, Johan and CG. Johan’s corrected roster is Doran, Canyon, Knight, Keria and Viper; cross-fantasy-team overlap remains allowed if configured.
- Default tournament scope is every source row with league WLDs, year 2026. This is a source label, not independently verified bracket membership. Optional `from` is inclusive and `to` exclusive. Set the actual draft eligibility window before treating standings as final.
- Source naive timestamps are treated as UTC for consistent filtering. Oracle's page did not establish the source timezone; confirm this if an exact time boundary matters. Original source timestamps are preserved in the CSV.
- This checkpoint resolves identities from players present in the snapshot. Unknown/absent players are explicitly rejected. An independent roster registry for drafted players with no source appearances belongs to the database step.
