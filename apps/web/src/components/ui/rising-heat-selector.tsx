'use client';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import type {HeatLevel} from '@after-dark/contracts';
import {useTranslations} from 'next-intl';
import {useHeat} from '@/lib/games';

/** Sweet → Wild. Saturation and depth carry the intensity. */
export const HEAT_COLORS=['#D89BAE','#E96A95','#EC3569','#C81943','#900A2F'] as const;
const LEVELS=[1,2,3,4,5] as const;
// Stops sit at the centre of five equal columns, so the track runs from 10% to 90%.
const stopX=(level:number)=>10+(level-1)*20;
// The flame grows with the heat: Sweet is the smallest, Wild the largest.
const FLAME_WIDTH=[22,26,30,35,40] as const;

/** The active-stop indicator: the level's colour, an ivory outline for contrast on any stop, and an ivory core. */
function Flame({color,width}:{color:string;width:number}){
 return <svg viewBox="0 0 24 30" aria-hidden className="heat-flame block overflow-visible" style={{width,height:width*1.25}}>
  <path d="M12 1.2c1.2 4 4.4 6.4 6.6 9.5 1.8 2.5 2.9 5.2 2.9 8.3 0 5.7-4.2 10-9.5 10S2.5 24.7 2.5 19c0-3.6 1.6-6.6 3.9-8.7.2 2.2 1.2 3.8 2.9 4.7-.6-5 .6-9.8 2.7-13.8Z" fill={color} stroke="var(--ivory)" strokeWidth="1.9" strokeLinejoin="round" className="transition-[fill] duration-500"/>
  <path d="M12.2 16c1.9 2 3.8 3.7 3.8 6.4 0 2.4-1.8 4.3-4 4.3s-4-1.9-4-4.3c0-1.7.8-3.1 2-4.1.3 1.1 1 1.8 1.8 2.2-.2-1.6-.1-3.1.4-4.5Z" fill="var(--ivory)" opacity=".92"/>
 </svg>;
}

/**
 * One continuous heat track with five stops and a flame on the selected one. Radio semantics: arrow keys move and select,
 * Home/End jump. `readOnly` shows the level without letting this player change it (the partner sees the host's pick).
 * The pick shows immediately and rolls back if the server rejects it.
 */
export function RisingHeatSelector({value,onChange,labelledBy,readOnly=false,caption}:{value:HeatLevel;onChange?:(level:HeatLevel)=>Promise<boolean>;labelledBy:string;readOnly?:boolean;caption?:string}){
 const heat=useHeat(),t=useTranslations('heat');const [pending,setPending]=useState<HeatLevel|null>(null);const stops=useRef<(HTMLButtonElement|null)[]>([]);
 useEffect(()=>{setPending(null)},[value]);
 const shown=pending??value;
 async function choose(level:HeatLevel,focus=false){
  if(focus)stops.current[level-1]?.focus();
  if(readOnly||!onChange||level===shown)return;
  setPending(level);
  if(!await onChange(level))setPending(null);
 }
 function onKeyDown(e:KeyboardEvent){
  const next=e.key==='ArrowRight'||e.key==='ArrowUp'?shown+1:e.key==='ArrowLeft'||e.key==='ArrowDown'?shown-1:e.key==='Home'?1:e.key==='End'?5:null;
  if(next===null||readOnly)return;e.preventDefault();choose(Math.max(1,Math.min(5,next)) as HeatLevel,true);
 }
 const fillEnd=stopX(shown),color=HEAT_COLORS[shown-1];
 return <div>
  <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby="heat-selected" onKeyDown={onKeyDown} className="relative mt-5 grid select-none grid-cols-5">
   {/* Track: a quiet base, then the heat gradient revealed up to the chosen stop. The fill thickens as the heat rises. */}
   <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[26px]">
    <div className="absolute left-[10%] right-[10%] h-1 -translate-y-1/2 rounded-full bg-ivory/[.12]"/>
    <div className="heat-fill absolute left-[10%] right-[10%] -translate-y-1/2 rounded-full" style={{height:4+shown,background:`linear-gradient(90deg,${HEAT_COLORS.join(',')})`,clipPath:`inset(0 ${(90-fillEnd)/80*100}% 0 0 round 999px)`}}/>
   </div>
   <span aria-hidden className="heat-thumb pointer-events-none absolute top-[26px] z-10 -translate-x-1/2 -translate-y-[68%]" style={{left:`${fillEnd}%`}}><Flame color={color} width={FLAME_WIDTH[shown-1]}/></span>
   {LEVELS.map(level=>{const on=level===shown,reached=level<=shown;return <button key={level} ref={el=>{stops.current[level-1]=el}} type="button" role="radio" aria-checked={on} aria-disabled={readOnly||undefined} tabIndex={on?0:-1} onClick={()=>choose(level)}
    className={`group flex min-h-[78px] min-w-0 flex-col items-center focus-visible:outline-none ${readOnly?'cursor-default':''}`}>
    <span aria-hidden className="grid h-[52px] w-full place-items-center"><span className={`heat-dot relative block h-2.5 w-2.5 rounded-full transition-[background-color,transform] duration-300 ${readOnly?'':'group-hover:scale-125'}`} style={{background:reached?HEAT_COLORS[level-1]:'#2B2B2B',boxShadow:reached?'none':'inset 0 0 0 1.5px rgba(247,243,236,.28)',opacity:on?0:1}}/></span>
    <span className={`heat-stop-label decoration-pink decoration-2 underline-offset-[6px] group-focus-visible:underline text-[10.5px] font-bold uppercase tracking-[.1em] transition-colors min-[360px]:text-[11px] min-[360px]:tracking-[.14em] ${on?'text-ivory':reached?'text-ivory/80':'text-ivory/55'}`}>{heat.label(level)}</span>
   </button>})}
  </div>
  <div id="heat-selected" aria-live="polite" className="mt-3 flex items-start gap-3">
   <span aria-hidden className="mt-[.55rem] h-[3px] w-6 shrink-0 rounded-full transition-colors duration-300" style={{background:color}}/>
   <p className="min-w-0"><span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="display text-[1.7rem] leading-none">{heat.label(shown)}</span><span className="text-[11px] font-bold uppercase tracking-[.14em] text-ivory/60">{t('ofFive',{caption:caption||t('caption'),level:shown})}</span></span><span className="mt-1 block text-sm text-ivory/75">{heat.hint(shown)}</span></p>
  </div>
 </div>;
}
