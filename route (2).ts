import {NextResponse} from 'next/server';
import {getRuntimeDashboard} from '@/lib/live';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){const {teams,source,scope,scoringVersion,coverage,issues,sync}=await getRuntimeDashboard();return NextResponse.json({teams,source,scope,scoringVersion,coverage,issues,sync},{headers:{'Cache-Control':'no-store'}});}
