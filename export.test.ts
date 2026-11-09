import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'csv-parse/sync';
import {GET as exportData} from '../src/app/api/export/route';
import {GET as dashboard} from '../src/app/api/dashboard/route';

test('download CSV contains all 148 appearances and their exact scores',async()=>{
 const response=await exportData(new Request('http://localhost/api/export'));
 assert.ok(response.headers.get('content-type')?.includes('text/csv'));
 const records=parse(await response.text(),{bom:true,columns:true}) as Record<string,string>[];
 assert.equal(records.length,148);
 const totals=new Map<string,number>();for(const r of records)totals.set(r.fantasyTeam,(totals.get(r.fantasyTeam)??0)+Number(r.points));
 const data=await (await dashboard()).json();
 for(const team of data.teams)assert.ok(Math.abs(totals.get(team.name)!-team.total)<1e-9);
});
test('JSON export and dashboard endpoint expose consistent cumulative totals',async()=>{
 const json=await (await exportData(new Request('http://localhost/api/export?format=json'))).json();
 const data=await (await dashboard()).json();
 assert.deepEqual(json,data);assert.equal(data.players.length,15);assert.equal(data.teams[0].name,'Team Johan');
});
