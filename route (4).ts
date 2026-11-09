import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {refreshRuntime} from '@/lib/live';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
async function refresh(){const result=await refreshRuntime();return NextResponse.json(result,{status:result.outcome==='failed'||result.outcome==='not-configured'?503:result.outcome==='in-progress'?202:200,headers:{'Cache-Control':'no-store'}});}
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;if(!secret)return NextResponse.json({error:'Scheduled updates need configuration.'},{status:503});
 const actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret}`);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:'Unauthorized'},{status:401});
 return refresh();
}
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 const host=request.headers.get('host')??new URL(request.url).host;
 let sameOrigin=false;try{const parsed=new URL(origin??'');sameOrigin=parsed.host===host && ['https:','http:'].includes(parsed.protocol);}catch{/* Missing or invalid browser origin. */}
 if(!sameOrigin || request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Same-origin request required.'},{status:403});
 return refresh();
}
