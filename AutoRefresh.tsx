'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {PublicSync} from '@/lib/sync/types';
export default function AutoRefresh({initial}:{initial:PublicSync}){
 const [sync,setSync]=useState(initial),[busy,setBusy]=useState(false);
 const active=useRef(false),lastSeen=useRef(initial.lastSuccessAt),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true),router=useRouter();
 useEffect(()=>{setSync(initial);lastSeen.current=initial.lastSuccessAt;},[initial]);
 const check=useCallback(async function checkNow(){
  if(active.current||!alive.current)return;active.current=true;setBusy(true);
  try{
   const response=await fetch('/api/refresh',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(65000)});
   const result=await response.json();if(!alive.current)return;
   if(result.sync)setSync(result.sync);
   if(result.sync?.lastSuccessAt && result.sync.lastSuccessAt!==lastSeen.current){lastSeen.current=result.sync.lastSuccessAt;router.refresh();}
   if(result.outcome==='in-progress'||result.sync?.status==='running')timer.current=setTimeout(()=>void checkNow(),5000);
  }catch{if(alive.current)setSync(s=>({...s,status:'error',message:'Could not check for updates. The displayed scores are still available.'}));}
  finally{active.current=false;if(alive.current)setBusy(false);}
 },[router]);
 useEffect(()=>{alive.current=true;if(initial.enabled)void check();const visible=()=>{if(document.visibilityState==='visible'&&initial.enabled)void check();};document.addEventListener('visibilitychange',visible);return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);document.removeEventListener('visibilitychange',visible);};},[check,initial.enabled]);
 return <section className={`sync-bar ${sync.status==='error'||!sync.enabled?'sync-attention':''}`} aria-live="polite"><div><span className="status-dot"/><strong>{busy?'Checking for new games…':sync.enabled?'Daily updates':'Saved game data'}</strong><span>{sync.message}</span>{sync.lastSuccessAt&&<small>Last checked {new Date(sync.lastSuccessAt).toLocaleString('en-GB',{timeZone:'Europe/Stockholm',dateStyle:'short',timeStyle:'short'})} Stockholm</small>}</div><button className="button button-small" onClick={()=>void check()} disabled={busy}>{busy?'Checking…':'Check for updates'}</button></section>;
}
