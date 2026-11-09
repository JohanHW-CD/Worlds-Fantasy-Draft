import { z } from 'zod';

export const SCORING_VERSION = 'v1-no-objectives-no-teamfights';
const count = z.number().int().nonnegative();
export const statsSchema = z.object({
  durationMinutes: z.number().positive().finite(), kills: count, assists: count, deaths: count,
  csDifference: z.number().int(), playerGold: z.number().nonnegative().finite(),
  opponentGold: z.number().nonnegative().finite(), win: z.union([z.literal(0),z.literal(1)]),
}).strict();
export type PlayerStats = z.infer<typeof statsSchema>;

export function scorePlayerGame(input: unknown, lambda = 1) {
  const stats = statsSchema.parse(input);
  z.number().finite().nonnegative().parse(lambda);
  const components = {
    kills: 1.5 * stats.kills, assists: stats.assists, deaths: -0.5 * stats.deaths,
    cs: stats.csDifference / 20,
    gold: lambda * (Math.min(stats.playerGold, 20000) - Math.min(stats.opponentGold, 20000)) / 1000,
    win: 2 * stats.win,
  };
  const baseScore = Object.values(components).reduce((sum, n) => sum+n, 0);
  const durationMultiplier = Math.exp((33-stats.durationMinutes)/33);
  const total = baseScore * durationMultiplier;
  if (!Number.isFinite(total)) throw new Error('Score exceeds numeric range');
  return {scoringVersion: SCORING_VERSION, lambda, components, baseScore, durationMultiplier, total};
}
