import type {PlayerGame} from '../types';
import type {importCsv} from '../importer';
export type ImportResult=ReturnType<typeof importCsv>;
export interface StoredSnapshot{version:1;fingerprint:string;retrievedAt:string;hash:string;games:PlayerGame[];coverage:ImportResult['summary'];issues:ImportResult['issues']}
export interface SyncState{snapshot?:string;lastAttemptAt?:string;lastSuccessAt?:string;lastSuccessDay?:string;status:'running'|'success'|'error';lastError?:string}
export interface SyncStore{read():Promise<SyncState|null>;acquire(token:string):Promise<boolean>;commit(token:string,state:SyncState):Promise<boolean>;release(token:string):Promise<void>}
export interface PublicSync{enabled:boolean;status:'setup-required'|'running'|'success'|'error'|'waiting';lastAttemptAt:string|null;lastSuccessAt:string|null;message:string;nextCheck:string;}
