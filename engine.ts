import {gzipSync,gunzipSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {statsSchema} from '../scoring';
import {SourceError} from './source';
import type {PublicSync,StoredSnapshot,SyncState,SyncStore} from './types';
export function stockholmClock(now:Date){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=(key:string)=>parts.find(p=>p.type===key)!.value;
 return {day:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour'))};
}
export function shouldRefresh(state:SyncState|null,now:Date){
 const {day,hour}=stockholmClock(now);
 if(hour<6 || state?.lastSuccessDay===day)return false;
 const age=state?.lastAttemptAt?now.getTime()-Date.parse(state.lastAttemptAt):Infinity;
 return !Number.isFinite(age)||age>=(state?.status==='running'?180000:3600000);
}
const snapshotSchema=z.object({version:z.literal(1),fingerprint:z.string(),retrievedAt:z.string().datetime(),hash:z.string(),games:z.array(z.object({key:z.string(),gameId:z.string(),date:z.string().datetime(),league:z.string(),year:z.number().int(),playerId:z.string(),playerName:z.string(),teamName:z.string(),role:z.enum(['top','jng','mid','bot','sup']),side:z.enum(['Blue','Red']),opponentId:z.string(),opponentName:z.string(),opponentTeam:z.string().optional(),champion:z.string().optional(),stats:statsSchema})).min(1),coverage:z.object({sourceRows:z.number(),scopedGames:z.number(),scoredGames:z.number(),skippedByDate:z.number(),rejectedGames:z.number()}),issues:z.array(z.object({gameKey:z.string(),reason:z.string()}))});
export function encodeSnapshot(snapshot:StoredSnapshot){return gzipSync(JSON.stringify(snapshot)).toString('base64');}
export function decodeSnapshot(value:string|undefined,fingerprint:string):StoredSnapshot|null{
 if(!value)return null;
 try{const s=snapshotSchema.parse(JSON.parse(gunzipSync(Buffer.from(value,'base64'),{maxOutputLength:25*1024*1024}).toString()));if(s.version!==1||s.fingerprint!==fingerprint||!Array.isArray(s.games)||!s.games.length)return null;return s;}catch{return null;}
}
export function publicSync(state:SyncState|null,enabled:boolean,message?:string):PublicSync{
 return {enabled,status:!enabled?'setup-required':state?.status??'waiting',lastAttemptAt:state?.lastAttemptAt??null,lastSuccessAt:state?.lastSuccessAt??null,message:message??(!enabled?'Automatic updates are not connected. Showing the saved scores.':state?.status==='error'?(state.lastError??'Update failed. Previous scores are available.'):state?.status==='running'?'Checking the source. Previous scores remain available.':state?.lastSuccessAt?'Daily updates connected.':'Waiting for the first automatic update.'),nextCheck:'Daily from 06:00 Europe/Stockholm, or on the first visit afterwards.'};
}
export async function runRefresh(options:{store:SyncStore;now:()=>Date;fingerprint:string;fallback:StoredSnapshot;load:(previous:StoredSnapshot)=>Promise<StoredSnapshot>}){
 const {store,now,fingerprint,fallback,load}=options;
 let state=await store.read();
 if(!shouldRefresh(state,now()))return {outcome:'fresh' as const,sync:publicSync(state,true)};
 const token=randomUUID();if(!await store.acquire(token))return {outcome:'in-progress' as const,sync:publicSync({...state,status:'running'},true)};
 try{
  state=await store.read();if(!shouldRefresh(state,now()))return {outcome:'fresh' as const,sync:publicSync(state,true)};
  const started=now();const pending:SyncState={...state,lastAttemptAt:started.toISOString(),status:'running',lastError:undefined};
  if(!await store.commit(token,pending))throw new Error('Refresh lease expired.');
  try{
   const previous=decodeSnapshot(state?.snapshot,fingerprint)??fallback;
   const snapshot=await load(previous);
   if(snapshot.fingerprint!==fingerprint)throw new SourceError('The source scope does not match this draft.');
   const next:SyncState={snapshot:encodeSnapshot(snapshot),lastAttemptAt:started.toISOString(),lastSuccessAt:now().toISOString(),lastSuccessDay:stockholmClock(started).day,status:'success'};
   if(!await store.commit(token,next))throw new Error('Refresh lease expired.');
   return {outcome:snapshot.hash===previous.hash?'unchanged' as const:'updated' as const,sync:publicSync(next,true)};
  }catch(error){
   const failed:SyncState={...pending,status:'error',lastError:error instanceof SourceError?error.message:'The update failed. Previous scores were preserved.'};
   if(!await store.commit(token,failed))throw new Error('Refresh lease expired.');
   return {outcome:'failed' as const,sync:publicSync(failed,true)};
  }
 }finally{try{await store.release(token);}catch{/* The lease expires automatically; a successful commit remains valid. */}}
}
