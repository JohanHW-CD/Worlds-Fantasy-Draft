import {buildLeaderboard} from './leaderboard';
import {scorePlayerGame} from './scoring';
import type {FantasyTeam,PlayerGame} from './types';

export function buildAnalytics(rosters:FantasyTeam[], games:PlayerGame[], lambda=1, aliases:Record<string,string>={}) {
  const teams=buildLeaderboard(rosters,games,lambda,aliases);
  const selectedIds=new Set(teams.flatMap(t=>t.players.map(p=>p.id)));
  const chronological=games.filter(g=>selectedIds.has(g.playerId)).sort((a,b)=>a.date.localeCompare(b.date)||a.gameId.localeCompare(b.gameId)||a.playerId.localeCompare(b.playerId));
  const appearances=chronological.map(g=>({...g,score:scorePlayerGame(g.stats,lambda)}));
  const byGame=new Map<string,typeof appearances>();
  for(const g of appearances){const key=`${g.year}:${g.league}:${g.gameId}`;byGame.set(key,[...(byGame.get(key)??[]),g]);}
  const running=Object.fromEntries(teams.map(t=>[t.id,0]));
  const history:{index:number;gameId:string;date:string;matchup:string;totals:Record<string,number>;gains:Record<string,number>}[]=[];
  for(const [,group] of byGame){
    const gains=Object.fromEntries(teams.map(t=>[t.id,0]));
    for(const t of teams){const ids=new Set(t.players.map(p=>p.id));gains[t.id]=group.filter(g=>ids.has(g.playerId)).reduce((s,g)=>s+g.score.total,0);running[t.id]+=gains[t.id];}
    const first=group[0];
    history.push({index:history.length+1,gameId:first.gameId,date:first.date,matchup:[first.teamName,first.opponentTeam??first.opponentName].sort().join(' vs '),totals:{...running},gains});
  }
  const players=teams.flatMap(t=>t.players.map(p=>{
    const played=appearances.filter(g=>g.playerId===p.id);
    let cumulative=0;
    return {...p,fantasyTeamId:t.id,fantasyTeam:t.name,average:p.gamesPlayed?p.total/p.gamesPlayed:0,wins:played.filter(g=>g.stats.win===1).length,best:played.length?Math.max(...played.map(g=>g.score.total)):0,latest:played.at(-1)?.score.total??0,history:played.map((g,i)=>({index:i+1,key:g.key,date:g.date,gameId:g.gameId,points:g.score.total,cumulative:(cumulative+=g.score.total),opponent:g.opponentName,opponentTeam:g.opponentTeam??'',champion:g.champion??''}))};
  })).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  return {teams,history,players,appearances,selectedGames:byGame.size};
}
export type Analytics = ReturnType<typeof buildAnalytics>;
