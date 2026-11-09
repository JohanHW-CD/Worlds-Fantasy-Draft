import {NextResponse} from 'next/server';
import {getRuntimeDashboard} from '@/lib/live';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json(await getRuntimeDashboard(),{headers:{'Cache-Control':'no-store'}});}
