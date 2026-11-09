import {NextResponse} from 'next/server';
import {config} from '@/lib/data';
import {getRuntimeInput} from '@/lib/live';
import {playerCatalog,resolvePlayers} from '@/lib/leaderboard';
import {scorePlayerGame} from '@/lib/scoring';
export const runtime='nodejs';
export async function GET(request:Request) {
  const name=new URL(request.url).searchParams.get('name');
  const {snapshot}=await getRuntimeInput();
  const games=snapshot.games;
  if(!name) return NextResponse.json({players:playerCatalog(games)});
  try {
    const [player]=resolvePlayers([name],games,config.aliases);
    const appearances=games.filter(g=>g.playerId===player.id).sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
    const scored=appearances.map(g=>({...g,score:scorePlayerGame(g.stats,config.lambda)}));
    return NextResponse.json({player,games:scored,total:scored.reduce((s,g)=>s+g.score.total,0)});
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:'Player lookup failed'},{status:404});}
}
