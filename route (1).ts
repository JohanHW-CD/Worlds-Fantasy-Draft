import {getRuntimeDashboard} from '@/lib/live';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const data=await getRuntimeDashboard();
  if(new URL(request.url).searchParams.get('format')==='json')return Response.json(data,{headers:{'Content-Disposition':'attachment; filename="fantasy-worlds-data.json"'}});
  const fields=['gameId','date','player','fantasyTeam','role','team','opponentTeam','opponent','champion','durationMinutes','kills','deaths','assists','csDifference','playerGold','opponentGold','win','killPoints','assistPoints','deathPoints','csPoints','goldPoints','winPoints','baseScore','durationMultiplier','points','scoringVersion'];
  const rows=data.appearances.map(g=>[g.gameId,g.date,g.playerName,data.players.find(p=>p.id===g.playerId)?.fantasyTeam,g.role,g.teamName,g.opponentTeam,g.opponentName,g.champion,g.stats.durationMinutes,g.stats.kills,g.stats.deaths,g.stats.assists,g.stats.csDifference,g.stats.playerGold,g.stats.opponentGold,g.stats.win,g.score.components.kills,g.score.components.assists,g.score.components.deaths,g.score.components.cs,g.score.components.gold,g.score.components.win,g.score.baseScore,g.score.durationMultiplier,g.score.total,data.scoringVersion]);
  const csv=[fields,...rows].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  return new Response('\uFEFF'+csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="fantasy-worlds-games.csv"'}});
}
