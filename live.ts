import {createHash} from 'node:crypto';
import {config,getData} from './data';
import {buildAnalytics} from './analytics';
import {SCORING_VERSION} from './scoring';
import sourceAudit from '../../data/source-audit.json';
import {createStore} from './sync/store';
import {decodeSnapshot,publicSync,runRefresh} from './sync/engine';
import {downloadSnapshot} from './sync/source';
import type {StoredSnapshot,SyncState} from './sync/types';
export const fingerprint=createHash('sha256').update(JSON.stringify(config.scope)).digest('hex').slice(0,16);
const prefix=`${process.env.FANTASY_STORE_PREFIX??'fantasy-worlds'}:${fingerprint}`;
function fallback():StoredSnapshot{const d=getData();return {version:1,fingerprint,retrievedAt:sourceAudit.retrievedAt,hash:sourceAudit.sha256,games:d.games,coverage:d.summary,issues:d.issues};}
export async function getRuntimeInput(){
 const store=createStore(prefix);let state:SyncState|null=null;let storageError=false;
 try{state=store?await store.read():null;}catch{storageError=true;}
 const stored=decodeSnapshot(state?.snapshot,fingerprint);
 const snapshot=stored??fallback();
 const enabled=!!store&&!!process.env.ORACLES_CSV_URL;
 const sync=publicSync(state,enabled,storageError?'Saved live data could not be reached. Showing the bundled fallback scores.':state?.snapshot&&!stored?'Saved live data failed validation. Showing the bundled fallback scores.':undefined);
 if(storageError||(state?.snapshot&&!stored))sync.status='error';
 return {snapshot,sync,fromStore:!!stored};
}
export async function getRuntimeDashboard(){
 const {snapshot,sync,fromStore}=await getRuntimeInput();
 return {...buildAnalytics(config.fantasyTeams,snapshot.games,config.lambda,config.aliases),scoringVersion:SCORING_VERSION,lambda:config.lambda,scope:config.scope,source:{url:sourceAudit.source,retrievedAt:snapshot.retrievedAt,lastGameDate:snapshot.games.map(g=>g.date).sort().at(-1)??null,mode:fromStore?'automatic-snapshot':'bundled-snapshot',updateFrequency:'daily'},coverage:snapshot.coverage,issues:snapshot.issues,sync};
}
export async function refreshRuntime(){
 const store=createStore(prefix),url=process.env.ORACLES_CSV_URL;
 if(!store||!url)return {outcome:'not-configured' as const,sync:publicSync(null,false)};
 try{return await runRefresh({store,now:()=>new Date(),fingerprint,fallback:fallback(),load:previous=>downloadSnapshot(url,config.scope,config.fantasyTeams,config.lambda,config.aliases,fingerprint,previous,new Date())});}
 catch{return {outcome:'failed' as const,sync:publicSync(null,true,'The update service is temporarily unavailable. Saved scores remain available.')};}
}
