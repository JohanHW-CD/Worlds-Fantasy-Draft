import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'csv-parse/sync';
import {importCsv} from '../src/lib/importer';
import {buildLeaderboard,resolvePlayers} from '../src/lib/leaderboard';
import {scorePlayerGame} from '../src/lib/scoring';
const csv=readFileSync('data/worlds-2026.csv','utf8');
const scope={league:'WLDs',year:2026};
const data=importCsv(csv,scope);
const rows=parse(csv,{columns:true}) as Record<string,string>[];
const first=rows.filter(r=>r.gameid===rows[0].gameid);
function serialize(rows:Record<string,string>[]){const keys=Object.keys(rows[0]); const q=(v:string)=>'"'+v.replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(q).join(',')).join('\n')}
test('real snapshot: 99 complete games, ten scored players per game',()=>{assert.equal(data.games.length,990);assert.deepEqual(data.issues,[]);assert.equal(data.summary.scoredGames,99)});
test('real game opponents and score checked independently',()=>{
  const a=data.games.find(g=>g.playerName==='TheShy' && g.gameId===first[0].gameid)!;
  const raw=first.find(r=>r.playername==='TheShy')!;
  const opp=first.find(r=>r.position==='top' && r.side!==raw.side)!;
  assert.equal(a.opponentName,opp.playername);assert.equal(a.stats.durationMinutes,2423/60);
  const expected=Math.exp((33-2423/60)/33)*(1.5*2+6-0.5*1+(329-Number(opp['total cs']))/20+(Math.min(15898,20000)-Math.min(Number(opp.totalgold),20000))/1000+2);
  assert.equal(scorePlayerGame(a.stats).total,expected);
});
test('missing gold rejects whole game instead of scoring zero',()=>{const edited=first.map(r=>({...r}));edited[0].totalgold='';const result=importCsv(serialize(edited),scope);assert.equal(result.games.length,0);assert.equal(result.issues.length,1)});
test('duplicate player row rejects game',()=>{const result=importCsv(serialize([...first,first[0]]),scope);assert.equal(result.games.length,0);assert.equal(result.issues.length,1)});
test('incomplete data and missing opponents reject entire game',()=>{const edited=first.map(r=>({...r}));edited[0].datacompleteness='partial';assert.equal(importCsv(serialize(edited),scope).games.length,0);assert.equal(importCsv(serialize(first.filter(r=>r.playername!==first[0].playername)),scope).games.length,0)});
test('filters scope and dates before publishing scores',()=>{assert.equal(importCsv(csv,{...scope,year:2025}).games.length,0);assert.equal(importCsv(csv,{...scope,from:'2027-01-01T00:00:00Z'}).games.length,0);assert.throws(()=>importCsv(csv,{...scope,from:'bad'}))});
test('names resolve case-insensitively; unknown and ambiguous fail',()=>{assert.equal(resolvePlayers(['canyon'],data.games)[0].name,'Canyon');assert.throws(()=>resolvePlayers(['unknown player'],data.games));const fake={...data.games[0],playerId:'different'};assert.throws(()=>resolvePlayers([fake.playerName],[data.games[0],fake]));assert.equal(resolvePlayers(['my alias'],data.games,{'my alias':'Canyon'})[0].name,'Canyon')});
test('aggregation sums player-games and gives shared ranks',()=>{const teams=[{id:'a',name:'A',players:['Canyon','Keria']},{id:'b',name:'B',players:['Canyon','Keria']}];const board=buildLeaderboard(teams,data.games);assert.equal(board[0].rank,1);assert.equal(board[1].rank,1);const expected=data.games.filter(g=>['Canyon','Keria'].includes(g.playerName)).sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));assert.equal(board[0].gamesPlayed,expected.length);assert.ok(Math.abs(board[0].total-expected.reduce((s,g)=>s+scorePlayerGame(g.stats).total,0))<1e-10);assert.throws(()=>buildLeaderboard(teams,[...data.games,data.games[0]]));assert.throws(()=>buildLeaderboard([{id:'a',name:'A',players:['Canyon','canyon']}],data.games))});
