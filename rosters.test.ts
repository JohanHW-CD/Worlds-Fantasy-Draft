import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getLeaderboard,getData,config} from '../src/lib/data';
import {scorePlayerGame} from '../src/lib/scoring';

const expected=[
  {id:'wille',name:'Team Wille',players:['Bin','Oner','Chovy','ON','Ruler']},
  {id:'johan',name:'Team Johan',players:['Doran','Canyon','Knight','Keria','Viper']},
  {id:'cg',name:'Team CG',players:['Kiin','Lucid','Faker','Career','Caliste']},
];
test('three user-supplied rosters are configured exactly, with shared picks allowed',()=>{
  assert.deepEqual(config.fantasyTeams,expected);
  const board=getLeaderboard();
  assert.equal(board.teams.length,3);
  const wille=board.teams.find(t=>t.id==='wille')!;
  const johan=board.teams.find(t=>t.id==='johan')!;
  assert.notDeepEqual(wille.players.map(p=>p.id),johan.players.map(p=>p.id));
  assert.equal(new Set(board.teams.flatMap(t=>t.players.map(p=>p.id))).size,15);
});
test('all fifteen distinct picks match supplied role and professional team',()=>{
  const expected:Record<string,[string,string]>={Bin:['top','Bilibili Gaming'],Oner:['jng','T1'],Chovy:['mid','Gen.G'],ON:['sup','Bilibili Gaming'],Ruler:['bot','Gen.G'],Kiin:['top','Gen.G'],Lucid:['jng','Dplus Kia'],Faker:['mid','T1'],Career:['sup','Dplus Kia'],Caliste:['bot','Karmine Corp'],Doran:['top','T1'],Canyon:['jng','Gen.G'],Knight:['mid','Bilibili Gaming'],Keria:['sup','T1'],Viper:['bot','Bilibili Gaming']};
  const catalog=getLeaderboard().players;
  for(const [name,[role,team]] of Object.entries(expected)){
    const found=catalog.filter(p=>p.name===name);assert.equal(found.length,1);
    assert.equal(found[0].role,role);assert.equal(found[0].team,team);
  }
});
test('each roster total independently sums only its players and game appearances',()=>{
  const {games}=getData();const board=getLeaderboard();
  for(const team of board.teams){
    const ids=new Set(team.players.map(p=>p.id));const selected=games.filter(g=>ids.has(g.playerId));
    const independent=selected.reduce((sum,g)=>sum+scorePlayerGame(g.stats,config.lambda).total,0);
    assert.ok(Math.abs(team.total-independent)<1e-9);assert.equal(team.gamesPlayed,selected.length);
    assert.equal(team.players.length,5);assert.equal(new Set(team.players.map(p=>p.role)).size,5);
  }
});
