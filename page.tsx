import {getRuntimeDashboard} from '@/lib/live';
import Dashboard from '@/components/Dashboard';
import AutoRefresh from '@/components/AutoRefresh';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page(){const data=await getRuntimeDashboard();return <Dashboard data={data} refreshControl={<AutoRefresh initial={data.sync}/>}/>;}
