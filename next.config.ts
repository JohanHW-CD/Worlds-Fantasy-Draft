import type {NextConfig} from 'next';
const config:NextConfig={turbopack:{root:process.cwd()},outputFileTracingIncludes:{'/*':['./data/worlds-2026.csv','./data/config.json','./data/source-audit.json']}};
export default config;
