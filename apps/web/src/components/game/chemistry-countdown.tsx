'use client';
import {useEffect,useMemo,useState} from 'react';
import {useTranslations} from 'next-intl';

const R=26,CIRCUMFERENCE=2*Math.PI*R;
export const mmss=(ms:number)=>{const total=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
/** Remaining time from the server's deadline, corrected by the server clock reference received with the same state. */
export const remainingMs=(endsAt:string,serverNow:string,receivedAt:number,clientNow:number)=>Date.parse(endsAt)-(Date.parse(serverNow)+(clientNow-receivedAt));

/**
 * The shared Chemistry countdown. The deadline always comes from the server: the client only measures how far its own
 * clock sits from `serverNow` (captured when that state arrived) and renders from there, so skewed phone clocks,
 * background tabs, refreshes and reconnects all land on the same second. Hitting 00:00 changes nothing in the game:
 * it shows a soft cue and leaves the decision to the players.
 */
export function ChemistryCountdown({endsAt,durationSeconds,serverNow,expired:serverExpired}:{endsAt:string;durationSeconds:number;serverNow:string;expired:boolean}){
 const t=useTranslations('card.chem');
 // Re-anchor whenever a fresh server state arrives.
 const receivedAt=useMemo(()=>Date.now(),[serverNow]);// eslint-disable-line react-hooks/exhaustive-deps
 const [now,setNow]=useState(()=>Date.now());
 const left=remainingMs(endsAt,serverNow,receivedAt,now),expired=serverExpired||left<=0;
 useEffect(()=>{if(expired)return;const id=setInterval(()=>setNow(Date.now()),250);const wake=()=>setNow(Date.now());document.addEventListener('visibilitychange',wake);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',wake)}},[expired]);
 const fraction=expired?0:Math.min(1,Math.max(0,left/(durationSeconds*1000)));const time=mmss(expired?0:left);
 return <div className={`chem-timer mt-3 flex items-center gap-3 rounded-[14px] border-2 px-3 py-2.5 ${expired?'chem-timer-expired border-crimson':'border-obsidian/15'}`} data-expired={expired||undefined}>
  <div className="relative grid h-16 w-16 shrink-0 place-items-center">
   <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
    <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-obsidian/10"/>
    <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" strokeLinecap="round" className="chem-timer-ring stroke-crimson" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE*(1-fraction)}/>
   </svg>
   <span role="timer" aria-label={t('timer.aria',{time})} className="display relative text-[17px] tabular-nums leading-none">{time}</span>
  </div>
  <div className="min-w-0">
   <p className={`text-[10px] font-bold uppercase tracking-[.2em] ${expired?'text-crimson':'text-obsidian/60'}`}>{expired?t('timer.expired'):t('timer.label')}</p>
   <p className="mt-0.5 text-[13px] leading-5 text-obsidian/80" aria-live="polite">{expired?t('timer.expiredNote'):t('timer.runningNote')}</p>
  </div>
 </div>;
}

/** "60 seconds" / "2 minutes" for a challenge length. */
export function useDuration(){
 const t=useTranslations('card.chem');
 return (seconds:number)=>seconds>=60&&seconds%60===0?t('timer.minutes',{count:seconds/60}):t('timer.seconds',{count:seconds});
}
