/** Build-time convenience. No network request unless the owner configures an explicit CSV URL. */
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
async function main(){
 const source=process.env.ORACLES_CSV_URL;
 if(!source){console.log('Using the bundled Oracle’s Elixir snapshot. Set ORACLES_CSV_URL to enable build-time refresh.');return;}
 const url=new URL(source);
 if(url.protocol!=='https:')throw new Error('ORACLES_CSV_URL must be an HTTPS CSV download URL');
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw new Error(`CSV download failed: HTTP ${response.status}. The existing deployed site is unchanged.`);
 if(response.headers.get('content-type')?.includes('text/html'))throw new Error('Source returned a web page, not a CSV. Use a direct downloadable CSV URL.');
 const chunks:Uint8Array[]=[];let length=0;
 if(!response.body)throw new Error('Empty CSV response');
 const reader=response.body.getReader();
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>120*1024*1024){await reader.cancel();throw new Error('CSV exceeds 120 MiB download limit');}chunks.push(value);}}finally{reader.releaseLock();}
 const dir=mkdtempSync(join(tmpdir(),'fantasy-worlds-'));
 try{
  const file=join(dir,'download.csv');writeFileSync(file,Buffer.concat(chunks));
  const imported=spawnSync(process.execPath,['--import','tsx','scripts/import-csv.ts',file,'--write'],{stdio:'inherit',timeout:120000});
  if(imported.error)throw imported.error;
  if(imported.status!==0)throw new Error('Downloaded CSV failed validation; build stopped to preserve the previous deployment.');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Data refresh failed');process.exitCode=1;});
