'use client';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {PlayerStats,RoomView} from '@after-dark/contracts';
import {WaitStatus} from '../ui/action-bar';
import {Button,ButtonLink} from '../ui/button';
import {LanguageSwitcher} from '../ui/language-switcher';

export function Results({room,meId,lobby}:{room:RoomView;meId:string;lobby:()=>void}){
 const t=useTranslations('results');
 const g=room.game!;const me=room.players.find(p=>p.id===meId)!,partner=room.players.find(p=>p.id!==meId);
 const mine=g.scores[meId]||0,theirs=partner?g.scores[partner.id]||0:0;
 // Not a contest, and not a rating: the headline speaks for the pair and rests on reads, never on Spark totals.
 const ids=[me,partner].filter(Boolean).map(p=>p!.id);
 const both=(right:keyof PlayerStats,total:keyof PlayerStats)=>({right:ids.reduce((n,id)=>n+(g.stats[id]?.[right]||0),0),total:ids.reduce((n,id)=>n+(g.stats[id]?.[total]||0),0)});
 const reads={scheduled:both('correctReads','reads'),extra:both('extraCorrectReads','extraReads'),reciprocal:both('reciprocalCorrectReads','reciprocalReads'),hinted:both('assistedCorrectReads','assistedReads')};
 const headline=Object.values(reads).some(r=>r.right>0)?t('headlineTie'):t('headlineZero');
 const chemistry=g.stats[meId]?.chemistryCompleted||0;const [returning,setReturning]=useState(false);
 return <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8 text-center">
  <LanguageSwitcher variant="compact" className="!absolute right-3 top-[max(.75rem,var(--safe-top))]"/>
  <Sparkles className="text-pink" size={38}/>
  <p className="mt-3 text-xs font-bold uppercase tracking-[.3em] text-pink">{t('eyebrow',{count:mine+theirs})}</p>
  <h1 className="display fx-headline mt-2 max-w-md text-[clamp(2.6rem,12vw,4.5rem)]">{headline}</h1>
  <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-3">{[me,partner].filter(Boolean).map(p=>{const s=g.stats[p!.id];return <div key={p!.id} className="card-frame text-obsidian"><div className="rounded-[8px] p-3">
   <p className="truncate text-xs font-bold uppercase tracking-wider">{p!.id===meId?t('you'):p!.nickname}</p><p className="display text-6xl text-crimson">{g.scores[p!.id]||0}</p><p className="text-[11px] font-bold uppercase tracking-wider">{t('sparks')}</p>
   <dl className="mt-3 space-y-1 text-left text-xs"><div className="flex justify-between gap-2"><dt>{t('mindsRead')}</dt><dd className="font-bold">{s?.correctReads||0}/{s?.reads||0}</dd></div>
   <div className="flex justify-between gap-2"><dt>{t('missions')}</dt><dd className="font-bold">{s?.missionsCompleted||0}</dd></div></dl>
  </div></div>})}</div>
  {/* Reads you made together, each kind with its own denominator: twist reads are never folded into the scheduled ones. */}
  <section className="mt-3 w-full max-w-md rounded-[14px] border-2 border-ivory/15 p-3 text-left" aria-labelledby="reads-together">
   <p id="reads-together" className="text-[10px] font-bold uppercase tracking-[.2em] text-pink">{t('together')}</p>
   <dl className="mt-2 space-y-1 text-xs">{(Object.keys(reads) as (keyof typeof reads)[]).filter(k=>k==='scheduled'||reads[k].total>0).map(k=><div key={k} className="flex justify-between gap-2"><dt>{t(`reads.${k}`)}</dt><dd className="font-bold tabular-nums">{t('ratio',{right:reads[k].right,total:reads[k].total})}</dd></div>)}</dl>
   <p className="mt-2 text-[11px] leading-4 text-ivory/65">{t('sparkNote')}</p>
  </section>
  <p className="mt-5 max-w-sm text-sm text-ivory/80">{chemistry>0?t('chemistry',{count:chemistry}):t('noChemistry')}</p>
  <div className="mt-7 flex w-full max-w-sm flex-col items-stretch gap-2">
   {me.isHost?<Button variant="primary" size="lg" loading={returning} loadingLabel={t('returning')} onClick={()=>{setReturning(true);lobby()}}>{t('hostAction')}</Button>
    :<WaitStatus>{t('waiting')}</WaitStatus>}
   <ButtonLink variant="ghost" href="/">{t('exit')}</ButtonLink>
  </div>
 </main>;
}
