import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
import {importCsv} from '../src/lib/importer';
import config from '../data/config.json';
const file=process.argv[2];
if(!file) throw new Error('Usage: npm run import:csv -- /absolute/path/to/official.csv [--write]');
const raw=readFileSync(file,'utf8');
const imported=importCsv(raw,config.scope);
console.log(JSON.stringify({summary:imported.summary,issues:imported.issues,sha256:createHash('sha256').update(raw).digest('hex')},null,2));
if(process.argv.includes('--write')) {
  if(!imported.games.length || imported.issues.length) throw new Error('Snapshot unchanged: import empty or contains rejected games');
  // Local preparation only. Production snapshot replacement occurs via a new deployment.
  const all=parse(raw,{bom:true,columns:true,skip_empty_lines:true}) as Record<string,string>[];
  const keys=new Set(imported.games.map(g=>g.gameId));
  const filtered=all.filter(r=>r.league===config.scope.league && Number(r.year)===config.scope.year && keys.has(r.gameid));
  const fields=Object.keys(all[0]);
  const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
  const csv=[fields,...filtered.map(r=>fields.map(f=>r[f]))].map(row=>row.map(quote).join(',')).join('\n')+'\n';
  const audit=JSON.parse(readFileSync('data/source-audit.json','utf8'));
  Object.assign(audit,{retrievedAt:new Date().toISOString(),filename:file.split('/').at(-1),sha256:createHash('sha256').update(raw).digest('hex'),sourceBytes:Buffer.byteLength(raw),scope:config.scope,rowCount:filtered.length,gameCount:imported.summary.scoredGames,firstGameDate:imported.games.map(g=>g.date).sort()[0],lastGameDate:imported.games.map(g=>g.date).sort().at(-1),columns:fields,players:[...new Set(imported.games.map(g=>g.playerName))].sort(),positions:filtered.reduce((counts,r)=>({...counts,[r.position]:(counts[r.position]??0)+1}),{} as Record<string,number>),completeness:filtered.reduce((counts,r)=>({...counts,[r.datacompleteness]:(counts[r.datacompleteness]??0)+1}),{} as Record<string,number>),rowsPerGame:{'12':imported.summary.scoredGames}});
  writeFileSync('data/worlds-2026.csv.tmp',csv);writeFileSync('data/source-audit.json.tmp',JSON.stringify(audit,null,2)+'\n');
  renameSync('data/worlds-2026.csv.tmp','data/worlds-2026.csv');renameSync('data/source-audit.json.tmp','data/source-audit.json');
  console.log('Local snapshot updated. Review changes and redeploy.');
}
