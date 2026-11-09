import type {PlayerStats} from './scoring';
export type Role = 'top' | 'jng' | 'mid' | 'bot' | 'sup';
export interface PlayerGame {
  key: string; gameId: string; league: string; year: number; date: string;
  playerId: string; playerName: string; teamName: string; role: Role; side: 'Blue'|'Red';
  opponentId: string; opponentName: string; opponentTeam?: string; champion?: string; stats: PlayerStats;
}
export interface FantasyTeam {id: string; name: string; players: string[]}
export interface Scope {league: string; year: number; from?: string; to?: string}
