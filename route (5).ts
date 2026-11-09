import {NextResponse} from 'next/server';
import {z} from 'zod';
import {scorePlayerGame,statsSchema} from '@/lib/scoring';
export const runtime='nodejs';
const requestSchema=z.object({stats:statsSchema,lambda:z.number().finite().nonnegative().default(1)}).strict();
export async function POST(request:Request) {
  if(Number(request.headers.get('content-length')??0)>16384) return NextResponse.json({error:'Payload too large'},{status:413});
  try {
    const text=await request.text();
    if(Buffer.byteLength(text)>16384) return NextResponse.json({error:'Payload too large'},{status:413});
    const {stats,lambda}=requestSchema.parse(JSON.parse(text));
    return NextResponse.json(scorePlayerGame(stats,lambda));
  } catch {return NextResponse.json({error:'Invalid scoring input. Supply all required finite numeric statistics; win must be 0 or 1. See README.'},{status:400});}
}
