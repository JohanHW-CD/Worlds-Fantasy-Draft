import {Redis} from '@upstash/redis';
import type {SyncState,SyncStore} from './types';
export function createStore(prefix:string):SyncStore|null{
 const url=process.env.UPSTASH_REDIS_REST_URL??process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN??process.env.KV_REST_API_TOKEN;
 if(!url||!token)return null;
 const redis=new Redis({url,token,automaticDeserialization:true,retry:{retries:1}});
 const stateKey=`${prefix}:state`,lockKey=`${prefix}:lock`;
 return {
  read:()=>redis.get<SyncState>(stateKey),
  acquire:async owner=>(await redis.set(lockKey,owner,{nx:true,ex:180}))==='OK',
  commit:async(owner,state)=>(await redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[2],ARGV[2]); return 1 else return 0 end",[lockKey,stateKey],[owner,JSON.stringify(state)]))===1,
  release:async owner=>{await redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",[lockKey],[owner]);},
 };
}
