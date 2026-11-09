import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDashboard} from '../src/lib/data';
import {buildAnalytics} from '../src/lib/analytics';
import type {PlayerGame} from '../src/lib/types';

test('every final cumulative team value equals its leaderboard total',()=>{
  const d=getDashboard();assert.equal(d.players.length,15);assert.equal(d.appearances.length,148);
  assert.equal(d.history.length,d.selectedGames);assert.ok(d.selectedGames<=d.coverage.scoredGames);
  for(const t of d.teams){assert.ok(Math.abs(d.history.at(-1)!.totals[t.id]-t.total)<1e-9);}
});
test('all player histories match their source scores and final totals',()=>{
 const d=getDashboard();
 for(const p of d.players){assert.equal(p.history.length,p.gamesPlayed);assert.ok(Math.abs(p.history.at(-1)!.cumulative-p.total)<1e-9);for(const h of p.history){const raw=d.appearances.find(g=>g.key===h.key)!;assert.equal(h.points,raw.score.total);}}
});
test('same-game roster players update atomically; inactive teams hold totals; negative scores lower cumulative',()=>{
 const base:PlayerGame={key:'a:1',gameId:'g1',date:'2026-01-01T00:00:00Z',league:'WLDs',year:2026,playerId:'a',playerName:'A',teamName:'Pro',role:'top',side:'Blue',opponentId:'x',opponentName:'X',stats:{durationMinutes:33,kills:0,assists:0,deaths:0,csDifference:0,playerGold:10000,opponentGold:10000,win:1}};
 const games=[base,{...base,key:'b:1',playerId:'b',playerName:'B',role:'mid' as const},{...base,key:'a:2',gameId:'g2',date:'2026-01-02T00:00:00Z',stats:{...base.stats,win:0 as const,deaths:10}}];
 const d=buildAnalytics([{id:'one',name:'One',players:['A','B']},{id:'empty',name:'Empty',players:[]}],games);
 assert.equal(d.history.length,2);assert.equal(d.history[0].totals.one,4);assert.equal(d.history[1].gains.one,-5);assert.equal(d.history[1].totals.one,-1);assert.equal(d.history[1].totals.empty,0);
});
test('analytics never mutates source ordering and sorts history chronologically',()=>{
 const d=getDashboard();const copy=[...d.appearances].reverse();const keys=copy.map(g=>g.key);buildAnalytics([{id:'one',name:'One',players:['Viper']}],copy);assert.deepEqual(copy.map(g=>g.key),keys);
 for(let i=1;i<d.history.length;i++)assert.ok(d.history[i].date>=d.history[i-1].date);
});
