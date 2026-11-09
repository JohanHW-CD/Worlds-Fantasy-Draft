import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import configFile from '../../data/config.json';
import sourceAudit from '../../data/source-audit.json';
import {importCsv} from './importer';
import {buildLeaderboard,playerCatalog} from './leaderboard';
import {SCORING_VERSION} from './scoring';
const configSchema=z.object({scope:z.object({league:z.string().min(1),year:z.number().int(),from:z.string().datetime().optional(),to:z.string().datetime().optional()}),lambda:z.number().nonnegative(),fantasyTeams:z.array(z.object({id:z.string().min(1),name:z.string().min(1),players:z.array(z.string().min(1)).max(5)})),aliases:z.record(z.string(),z.string())});
export const config=configSchema.parse(configFile);
let cached:ReturnType<typeof importCsv>|undefined;
export function getData() {
  cached??=importCsv(readFileSync(join(process.cwd(),'data/worlds-2026.csv'),'utf8'),config.scope);
  return cached;
}
export function getLeaderboard() {
  const data=getData();
  return {scoringVersion:SCORING_VERSION,scope:config.scope,lambda:config.lambda,source:{url:sourceAudit.source,retrievedAt:sourceAudit.retrievedAt,lastGameDate:sourceAudit.lastGameDate,mode:'bundled-snapshot',updateFrequency:'manual'},coverage:data.summary,issues:data.issues,teams:buildLeaderboard(config.fantasyTeams,data.games,config.lambda,config.aliases),players:playerCatalog(data.games)};
}

import {buildAnalytics} from './analytics';
export function getDashboard(){
  const imported=getData();
  const board=getLeaderboard();
  const analytics=buildAnalytics(config.fantasyTeams,imported.games,config.lambda,config.aliases);
  return {...analytics,scoringVersion:SCORING_VERSION,lambda:config.lambda,scope:config.scope,source:{...board.source,lastGameDate:imported.games.map(g=>g.date).sort().at(-1)??null},coverage:imported.summary,issues:imported.issues};
}
export type DashboardData = ReturnType<typeof getDashboard>;
