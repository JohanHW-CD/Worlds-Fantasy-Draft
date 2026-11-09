import {scorePlayerGame} from './scoring';
import type {FantasyTeam,PlayerGame} from './types';

export function playerCatalog(games:PlayerGame[]) {
  const map=new Map<string,{id:string;name:string;role:string;team:string;gamesPlayed:number}>();
  for(const g of games) {
    const p=map.get(g.playerId)??{id:g.playerId,name:g.playerName,role:g.role,team:g.teamName,gamesPlayed:0};
    p.gamesPlayed++; map.set(p.id,p);
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function resolvePlayers(names:string[], games:PlayerGame[], aliases:Record<string,string>={}) {
  const catalog=playerCatalog(games);
  return names.map(name=> {
    const target=aliases[name]??name;
    const matches=catalog.filter(p=>p.id===target || p.name.toLowerCase()===target.toLowerCase().trim());
    if(matches.length!==1) throw new Error(`${matches.length ? 'Ambiguous' : 'Unknown'} player: ${name}`);
    return matches[0];
  });
}
export function buildLeaderboard(teams:FantasyTeam[],games:PlayerGame[],lambda=1,aliases:Record<string,string>={}) {
  if(new Set(games.map(g=>g.key)).size!==games.length) throw new Error('Duplicate player-game records');
  if(new Set(teams.map(t=>t.id)).size!==teams.length) throw new Error('Duplicate fantasy team IDs');
  const rows=teams.map(team=> {
    const players=resolvePlayers(team.players,games,aliases);
    if(new Set(players.map(p=>p.id)).size!==players.length) throw new Error(`Duplicate player in ${team.name}`);
    const totals=players.map(p=> {
      const appearances=games.filter(g=>g.playerId===p.id).sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
      return {...p,total:appearances.reduce((s,g)=>s+scorePlayerGame(g.stats,lambda).total,0)};
    });
    return {...team,players:totals,total:totals.reduce((s,p)=>s+p.total,0),gamesPlayed:totals.reduce((s,p)=>s+p.gamesPlayed,0)};
  }).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  return rows.map((r,i)=>({...r,rank:rows.findIndex(x=>x.total===r.total)+1}));
}
