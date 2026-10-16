'use client';
import {useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {Ack,CardCategory,GameStateView,RoomView} from '@after-dark/contracts';
import {useHeat} from '@/lib/games';
import {Button} from '../ui/button';
import {LanguageSwitcher} from '../ui/language-switcher';
import type {Names} from './cards';
import {TypeEmblem} from './type-emblem';

/** The card type each briefing step teaches, in step order; the closing safety step covers every card, so it carries none. */
const STEP_TYPES:(CardCategory|null)[]=['MIND_READER','CHEMISTRY','SECRET_MISSION','PLOT_TWIST',null];
type Step={title:string;lines:string[]};
function useSteps(){const t=useTranslations('onboarding');return (t.raw('steps') as Step[]).map((s,i)=>({...s,type:STEP_TYPES[i]??null}))}

export function RulesList({heat,tone='dark'}:{heat:number;tone?:'dark'|'ivory'}){
 const t=useTranslations('onboarding'),h=useHeat();const steps=useSteps();
 return <ul className="space-y-3">{steps.map(({type,title,lines})=><li key={title} className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="display text-lg">{title}</p><ul className="mt-0.5 space-y-1 text-[13px] leading-5">{lines.map(l=><li key={l}>{l}</li>)}</ul></div>{type&&<TypeEmblem type={type} size="list" className="-mt-1"/>}</li>)}
  <li className={`rounded-[12px] px-3 py-2 text-xs font-bold uppercase tracking-wider ${tone==='ivory'?'bg-obsidian/10':'bg-ivory/10'}`}>{t('rulesHeat',{heat:h.label(heat)})}</li></ul>;
}

export function Onboarding({g,names,onReady,sending}:{g:GameStateView;names:Names;onReady:()=>Promise<Ack<RoomView>>;sending:boolean}){
 const t=useTranslations('onboarding'),tt=useTranslations('cardType'),h=useHeat();const steps=useSteps();
 const [step,setStep]=useState(0);const s=steps[step],last=step===steps.length-1;
 if(g.howToPlay.iAcknowledged)return <main className="grid h-[100dvh] place-items-center px-5 text-center"><div className="max-w-sm"><LoaderCircle className="mx-auto animate-spin text-pink" size={34}/><h1 className="display mt-4 text-4xl">{t('doneTitle')}</h1><p className="mt-2 text-ivory/80">{t('doneBody',{name:names.partner})}</p></div></main>;
 return <main className="flex h-[100dvh] flex-col px-4 pb-[max(.75rem,var(--safe-bottom))] pt-[max(.75rem,var(--safe-top))]">
  <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
   <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[.2em]"><span className="text-pink">{t('label')}</span><span className="flex items-center gap-2"><span className="text-ivory/70">{t('step',{current:step+1,total:steps.length})}</span><LanguageSwitcher variant="compact"/></span></div>
   <div className="mt-2 flex gap-1">{steps.map((_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<=step?'bg-crimson':'bg-ivory/15'}`}/>)}</div>
   <div className="min-h-0 flex-1 overflow-y-auto py-5">
    <section key={step} className="card-frame pop-in text-obsidian"><div className="rounded-[8px] bg-obsidian/[.04] p-4">
     {s.type&&<div className="-mr-1 -mt-1 mb-1 flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase leading-tight tracking-[.2em] text-crimson">{tt(s.type)}</p><TypeEmblem type={s.type} size="tutorial"/></div>}
     <h1 className="display text-[clamp(2rem,10vw,2.8rem)]">{s.title}</h1>
     <ul className="mt-3 space-y-2.5 text-[15px] leading-6">{s.lines.map(l=><li key={l} className="flex gap-2"><span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson"/>{l}</li>)}</ul>
     {last&&<p className="mt-4 rounded-[10px] bg-obsidian px-3 py-2 text-xs font-bold uppercase tracking-wider text-ivory">{t('heat',{heat:h.label(g.heat)})}</p>}
    </div></section>
    {g.howToPlay.partnerAcknowledged&&<p className="mt-3 text-center text-xs text-ivory/75">{t('partnerIn',{name:names.partner})}</p>}
   </div>
   <div className="flex items-center gap-2.5">
    {step>0&&<Button variant="ghost" disabled={sending} onClick={()=>setStep(step-1)}>{t('back')}</Button>}
    {last?<Button variant="primary" size="lg" className="flex-1" loading={sending} loadingLabel={t('dealing')} onClick={()=>onReady()}>{t('deal')}</Button>
     :<Button variant="primary" size="lg" className="flex-1" onClick={()=>setStep(step+1)}>{t('next')}</Button>}
   </div>
   {!last&&<Button variant="ghost" block className="mt-1" onClick={()=>setStep(steps.length-1)}>{t('skip')}</Button>}
  </div>
 </main>;
}
