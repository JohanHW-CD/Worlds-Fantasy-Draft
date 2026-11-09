import {createHash} from 'node:crypto';
import {importCsv} from '../importer';
import {buildAnalytics} from '../analytics';
import type {FantasyTeam,Scope} from '../types';
import type {StoredSnapshot} from './types';
export class SourceError extends Error{}
export async function downloadSnapshot(url:string,scope:Scope,rosters:FantasyTeam[],lambda:number,aliases:Record<string,string>,fingerprint:string,previous:StoredSnapshot|null,now:Date,fetcher:typeof fetch=fetch):Promise<StoredSnapshot>{
 let parsed:URL;try{parsed=new URL(url);}catch{throw new SourceError('The source download URL is invalid.');}
 if(parsed.protocol!=='https:')throw new SourceError('The source download URL must use HTTPS.');
 let response:Response;try{response=await fetcher(parsed,{cache:'no-store',signal:AbortSignal.timeout(40000)});}catch{throw new SourceError('The source download timed out or could not be reached.');}
 if(!response.ok)throw new SourceError(`The source returned HTTP ${response.status}.`);
 if(response.headers.get('content-type')?.includes('text/html'))throw new SourceError('The source returned a webpage instead of match data.');
 if(!response.body)throw new SourceError('The source returned an empty download.');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>120*1024*1024){await reader.cancel();throw new SourceError('The source download exceeded the size limit.');}chunks.push(value);}}finally{reader.releaseLock();}
 const raw=Buffer.concat(chunks);
 let imported:ReturnType<typeof importCsv>;
 try{imported=importCsv(raw.toString('utf8'),scope);}catch{throw new SourceError('The source CSV schema or contents failed validation.');}
 if(!imported.games.length || imported.issues.length)throw new SourceError('The download contained empty or incomplete tournament data.');
 if(previous){const keys=new Set(imported.games.map(g=>g.key));if(previous.games.some(g=>!keys.has(g.key)))throw new SourceError('The download is missing previously scored games; previous scores were preserved.');}
 try{buildAnalytics(rosters,imported.games,lambda,aliases);}catch{throw new SourceError('The download could not resolve all drafted players.');}
 return {version:1,fingerprint,retrievedAt:now.toISOString(),hash:createHash('sha256').update(raw).digest('hex'),games:imported.games,coverage:imported.summary,issues:imported.issues};
}
