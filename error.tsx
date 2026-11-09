'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{paddingTop:80,paddingBottom:80}}><p className="eyebrow">DATA UNAVAILABLE</p><h1>Let’s try that again.</h1><p>The scores could not be loaded. The dataset may need checking.</p><button className="button" onClick={reset}>Reload dashboard</button></main>;}
