'use client';
import {useEffect,useRef,useState} from 'react';
export interface ChartSeries {id:string;name:string;color:string;values:number[]}
export function LineChart({labels,series,height=250,compact=false,title}:{labels:string[];series:ChartSeries[];height?:number;compact?:boolean;title:string}){
  const [active,setActive]=useState<number|null>(null);
  const container=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(900);
  useEffect(()=>{const el=container.current;if(!el)return;const observer=new ResizeObserver(entries=>{const value=entries[0]?.contentRect.width;if(value)setWidth(Math.max(120,Math.round(value)));});observer.observe(el);return()=>observer.disconnect();},[]);
  const pad={left:compact?5:50,right:compact?5:18,top:15,bottom:compact?8:34};
  const vals=series.flatMap(s=>s.values).filter(Number.isFinite);
  const min=Math.min(0,...vals),max=Math.max(1,...vals),range=max-min||1;
  const low=min-range*.08,high=max+range*.08;
  const x=(i:number)=>pad.left+(width-pad.left-pad.right)*(labels.length<=1?.5:i/(labels.length-1));
  const y=(v:number)=>pad.top+(height-pad.top-pad.bottom)*(high-v)/(high-low);
  if(!labels.length || !series.length)return <div className="chart-empty">No games match this view.</div>;
  const focus=active===null?null:Math.min(active,labels.length-1);
  const inspection=focus===null?labels.length-1:focus;
  return <div ref={container} className={compact?'chart chart-compact':'chart'}>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio={compact?'none':'xMidYMid meet'} role="img" aria-label={title} onPointerLeave={()=>setActive(null)} onPointerMove={e=>{
      const rect=e.currentTarget.getBoundingClientRect();const px=(e.clientX-rect.left)/rect.width*width;
      setActive(Math.max(0,Math.min(labels.length-1,Math.round((px-pad.left)/(width-pad.left-pad.right)*Math.max(1,labels.length-1)))));
    }}>
      <title>{title}</title>
      {!compact && Array.from({length:5},(_,i)=>{const v=low+(high-low)*i/4;return <g key={i}><line x1={pad.left} x2={width-pad.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 7"/><text x={pad.left-12} y={y(v)+4} textAnchor="end" className="axis-label">{v.toFixed(0)}</text></g>})}
      {min<0 && <line x1={pad.left} x2={width-pad.right} y1={y(0)} y2={y(0)} stroke="var(--muted)" opacity=".4"/>}
      {series.map(s=><g key={s.id}><polyline points={s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={compact?3.5:3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>{s.values.length===1 && <circle cx={x(0)} cy={y(s.values[0])} r="4" fill={s.color}/>}{focus!==null && s.values[focus]!==undefined && <circle cx={x(focus)} cy={y(s.values[focus])} r={compact?4:5} fill={s.color} stroke="var(--panel)" strokeWidth="2"/>}</g>)}
      {focus!==null && <line x1={x(focus)} x2={x(focus)} y1={pad.top} y2={height-pad.bottom} stroke="var(--muted)" opacity=".4"/>}
      {!compact && [0,Math.floor((labels.length-1)/2),labels.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=><text key={i} x={x(i)} y={height-6} textAnchor={i===0?'start':i===labels.length-1?'end':'middle'} className="axis-label">{labels[i]}</text>)}
    </svg>
    {!compact && <><div className="chart-readout" aria-live="polite"><span>{labels[inspection]}</span>{series.map(s=><span key={s.id}><i style={{background:s.color}}/>{s.name} <strong>{(s.values[inspection]??0).toFixed(2)}</strong></span>)}</div><label className="chart-slider"><span>Inspect match</span><input type="range" min="0" max={Math.max(0,labels.length-1)} value={inspection} onChange={e=>setActive(Number(e.target.value))}/></label></>}
    {compact && <span className="sr-only">{series.map(s=>`${s.name}: ${s.values.map(v=>v.toFixed(2)).join(', ')}`).join('. ')}</span>}
  </div>;
}
