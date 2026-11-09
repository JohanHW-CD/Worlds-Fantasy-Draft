import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},title:'Worlds Fantasy — Every game. Every point.',description:'Follow Wille, Johan and CG’s League of Legends Worlds fantasy drafts. Cumulative team scores, player graphs and every match calculation.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
