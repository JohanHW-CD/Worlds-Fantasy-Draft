import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stockholmClock,shouldRefresh,encodeSnapshot,decodeSnapshot,runRefresh} from '../src/lib/sync/engine';
import {downloadSnapshot,SourceError} from '../src/lib/sync/source';
import type {SyncStore,SyncState,StoredSnapshot} from '../src/lib/sync/types';
import {getData,config} from '../src/lib/data';
class MemoryStore implements SyncStore{
 state:SyncState|null=null;owner:string|null=null;commits=0;
 async read(){return this.state?structuredClone(this.state):null;}
 async acquire(token:string){if(this.owner)return false;this.owner=token;return true;}
 async commit(token:string,state:SyncState){if(this.owner!==token)return false;this.state=structuredClone(state);this.commits++;return true;}
 async release(token:string){if(this.owner===token)this.owner=null;}
}
const data=getData();
const fallback:StoredSnapshot={version:1,fingerprint:'test',retrievedAt:'2026-11-07T10:00:00.000Z',hash:'old',games:data.games,coverage:data.summary,issues:[]};
const now=new Date('2026-11-08T07:00:00Z');
test('daily policy uses Stockholm calendar days, morning gate and DST',()=>{
 assert.deepEqual(stockholmClock(new Date('2026-07-01T04:00:00Z')),{day:'2026-07-01',hour:6});
 assert.deepEqual(stockholmClock(new Date('2026-11-08T05:00:00Z')),{day:'2026-11-08',hour:6});
 assert.equal(shouldRefresh(null,new Date('2026-11-08T04:59:00Z')),false);
 assert.equal(shouldRefresh(null,now),true);
 assert.equal(shouldRefresh({status:'success',lastSuccessDay:'2026-11-08'},now),false);
 assert.equal(shouldRefresh({status:'success',lastSuccessDay:'2026-11-07'},now),true);
 assert.equal(shouldRefresh({status:'error',lastAttemptAt:'2026-11-08T06:30:00Z'},now),false);
 assert.equal(shouldRefresh({status:'error',lastAttemptAt:'2026-11-08T05:59:00Z'},now),true);
 assert.equal(shouldRefresh({status:'running',lastAttemptAt:'2026-11-08T06:56:00Z'},now),true);
 assert.equal(shouldRefresh({status:'running',lastAttemptAt:'2026-11-08T06:59:00Z'},now),false);
});
test('stored snapshots round-trip and reject corrupt data or wrong tournament scope',()=>{
 const encoded=encodeSnapshot(fallback);assert.deepEqual(decodeSnapshot(encoded,'test'),fallback);
 assert.equal(decodeSnapshot(encoded,'other'),null);assert.equal(decodeSnapshot('bad','test'),null);
 assert.equal(decodeSnapshot(encodeSnapshot({...fallback,games:[{} as never]}),'test'),null);
});
test('one successful refresh suppresses further downloads on the same Stockholm day',async()=>{
 const store=new MemoryStore();let loads=0;
 const options={store,now:()=>now,fingerprint:'test',fallback,load:async()=>{loads++;return {...fallback,hash:'new',retrievedAt:now.toISOString()};}};
 assert.equal((await runRefresh(options)).outcome,'updated');
 assert.equal((await runRefresh(options)).outcome,'fresh');assert.equal(loads,1);assert.equal(store.state?.lastSuccessDay,'2026-11-08');
});
test('concurrent visitors perform only one source download',async()=>{
 const store=new MemoryStore();let loads=0;let release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});
 const options={store,now:()=>now,fingerprint:'test',fallback,load:async()=>{loads++;await waiting;return {...fallback,hash:'new'};}};
 const first=runRefresh(options);await new Promise(r=>setImmediate(r));
 const rest=await Promise.all(Array.from({length:8},()=>runRefresh(options)));
 assert.ok(rest.every(r=>r.outcome==='fresh'||r.outcome==='in-progress'));assert.equal(loads,1);release();await first;assert.equal(store.owner,null);
});
test('source failure preserves last successful scores and allows retry after cooldown',async()=>{
 const store=new MemoryStore();store.state={status:'success',snapshot:encodeSnapshot(fallback),lastSuccessAt:fallback.retrievedAt,lastSuccessDay:'2026-11-07'};
 const result=await runRefresh({store,now:()=>now,fingerprint:'test',fallback,load:async()=>{throw new SourceError('Source unavailable.');}});
 assert.equal(result.outcome,'failed');assert.equal(store.state?.status,'error');assert.equal(decodeSnapshot(store.state?.snapshot,'test')?.hash,'old');assert.equal(store.state?.lastSuccessDay,'2026-11-07');assert.equal(shouldRefresh(store.state,now),false);assert.equal(shouldRefresh(store.state,new Date('2026-11-08T08:01:00Z')),true);
});
test('unchanged file still records a successful daily freshness check',async()=>{
 const store=new MemoryStore();const result=await runRefresh({store,now:()=>now,fingerprint:'test',fallback,load:async()=>({...fallback,retrievedAt:now.toISOString()})});
 assert.equal(result.outcome,'unchanged');assert.equal(store.state?.lastSuccessAt,now.toISOString());
});
test('source downloader validates genuine CSV; HTML, errors and lost historical games cannot replace scores',async()=>{
 const csv=readFileSync('data/worlds-2026.csv','utf8');
 const loader=(body:string,status=200,type='text/csv')=>(async()=>new Response(body,{status,headers:{'Content-Type':type}})) as typeof fetch;
 const args=[config.scope,config.fantasyTeams,config.lambda,config.aliases,'test',fallback,now] as const;
 const result=await downloadSnapshot('https://fixture.invalid/data.csv',...args,loader(csv));assert.equal(result.games.length,990);
 await assert.rejects(()=>downloadSnapshot('https://fixture.invalid/data.csv',...args,loader('<html>login</html>',200,'text/html')),/webpage/);
 await assert.rejects(()=>downloadSnapshot('https://fixture.invalid/data.csv',...args,loader('unavailable',503)),/HTTP 503/);
 await assert.rejects(()=>downloadSnapshot('https://fixture.invalid/data.csv',...args,loader('bad,header\nx,y')),/schema/);
 const lines=csv.trimEnd().split('\n');const small=lines.slice(0,13).join('\n');
 await assert.rejects(()=>downloadSnapshot('https://fixture.invalid/data.csv',...args,loader(small)),/previously scored/);
});
