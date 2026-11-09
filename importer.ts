import {parse} from 'csv-parse/sync';
import {scorePlayerGame} from './scoring';
import type {PlayerGame, Role, Scope} from './types';

type Row = Record<string,string>;
const roles = ['top','jng','mid','bot','sup'];
const required = ['gameid','datacompleteness','league','year','date','playerid','playername','teamname','side','position','gamelength','kills','deaths','assists','result','totalgold','total cs'];
function num(row: Row, field: string) {
  if (!row[field]?.trim()) throw new Error(`Missing ${field}`);
  const n = Number(row[field]);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${field}`);
  return n;
}
function instant(value: string) {
  const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ','T')+'Z' : value;
  // Source timestamps have no timezone. We treat them consistently as UTC; provenance documents the assumption.
  if (!Number.isFinite(Date.parse(date))) throw new Error('Invalid game date');
  return new Date(date).toISOString();
}
export function importCsv(csv: string, scope: Scope) {
  if (!scope.league || !Number.isInteger(scope.year)) throw new Error('Explicit league and year required');
  for (const bound of [scope.from,scope.to]) if (bound && !Number.isFinite(Date.parse(bound))) throw new Error('Invalid date boundary');
  if (scope.from && scope.to && Date.parse(scope.from) >= Date.parse(scope.to)) throw new Error('Date range must be increasing');
  let header: string[] = [];
  const rows = parse(csv,{bom:true,skip_empty_lines:true,columns:(fields:string[])=> {
    header=fields;
    for(const field of required) if(!fields.includes(field)) throw new Error(`CSV schema missing ${field}`);
    return fields;
  }}) as Row[];
  if (!header.length) throw new Error('Empty CSV');
  const groups = new Map<string,Row[]>();
  for (const r of rows) {
    if(r.league!==scope.league || Number(r.year)!==scope.year) continue;
    if (!r.gameid) throw new Error('Missing game identifier');
    const key = `${r.year}:${r.league}:${r.gameid}`;
    groups.set(key,[...(groups.get(key)??[]),r]);
  }
  const games: PlayerGame[]=[];
  const issues: {gameKey:string;reason:string}[]=[];
  let skippedByDate=0;
  for(const [gameKey, all] of groups) {
    try {
      const players=all.filter(r=>r.position!=='team');
      if(players.length!==10) throw new Error(`Expected 10 players, got ${players.length}`);
      const dates=players.map(r=>instant(r.date));
      if(new Set(dates).size!==1) throw new Error('Inconsistent game dates');
      if((scope.from && Date.parse(dates[0])<Date.parse(scope.from)) || (scope.to && Date.parse(dates[0])>=Date.parse(scope.to))) {skippedByDate++;continue;}
      const ids=new Set<string>();
      for(const r of players) {
        if(r.datacompleteness!=='complete') throw new Error('Incomplete player data');
        if(!r.playerid || !r.playername || !r.teamname) throw new Error('Missing player identity or team');
        if(ids.has(r.playerid)) throw new Error('Duplicate player'); ids.add(r.playerid);
        if(!roles.includes(r.position) || !['Blue','Red'].includes(r.side)) throw new Error('Invalid role or side');
        if(players.filter(x=>x.position===r.position && x.side===r.side).length!==1) throw new Error('Duplicate role on same side');
      }
      if(new Set(players.map(r=>num(r,'gamelength'))).size!==1) throw new Error('Inconsistent duration');
      for(const side of ['Blue','Red']) {
        const team=players.filter(r=>r.side===side);
        if(new Set(team.map(r=>r.teamname)).size!==1 || new Set(team.map(r=>num(r,'result'))).size!==1) throw new Error('Inconsistent team or result');
      }
      const pending:PlayerGame[]=[];
      for(const r of players) {
        const opponents=players.filter(x=>x.position===r.position && x.side!==r.side);
        if(opponents.length!==1) throw new Error('Missing or ambiguous opponent');
        const opp=opponents[0];
        if(num(r,'result')+num(opp,'result')!==1) throw new Error('Results are not complementary');
        const playerCs=num(r,'total cs'), opponentCs=num(opp,'total cs');
        if(!Number.isInteger(playerCs) || playerCs<0 || !Number.isInteger(opponentCs) || opponentCs<0) throw new Error('Invalid final CS');
        const stats={durationMinutes:num(r,'gamelength')/60,kills:num(r,'kills'),assists:num(r,'assists'),deaths:num(r,'deaths'),csDifference:playerCs-opponentCs,playerGold:num(r,'totalgold'),opponentGold:num(opp,'totalgold'),win:num(r,'result') as 0|1};
        scorePlayerGame(stats);
        pending.push({key:`${gameKey}:${r.playerid}`,gameId:r.gameid,league:r.league,year:scope.year,date:instant(r.date),playerId:r.playerid,playerName:r.playername,teamName:r.teamname,role:r.position as Role,side:r.side as 'Blue'|'Red',opponentId:opp.playerid,opponentName:opp.playername,opponentTeam:opp.teamname,champion:r.champion||undefined,stats});
      }
      games.push(...pending);
    } catch(error) { issues.push({gameKey,reason:error instanceof Error ? error.message : 'Invalid game'}); }
  }
  return {games,issues,summary:{sourceRows:rows.length,scopedGames:groups.size,scoredGames:games.length/10,skippedByDate,rejectedGames:issues.length}};
}
