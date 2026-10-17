'use client';
import {useState} from 'react';
import {ChevronDown,CircleHelp,Crown,Eye,EyeOff,Layers,Lock,Sparkles,Zap} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {GameStateView,PlayerView} from '@after-dark/contracts';
import {useHeat} from '@/lib/games';
import {WaitStatus} from '../ui/action-bar';
import {Button,ctaClass} from '../ui/button';
import {IconButton} from '../ui/icon-button';
import {ChemistrySignal} from '../ui/chemistry-signal';
import {useRiseTick} from '../ui/event-fx';
import {LanguageSwitcher} from '../ui/language-switcher';
import {TypeEmblem} from './type-emblem';

export function Hud({g,me,partner,connected,onPowers,onRules,onClaimMission,onDrawMission,claiming,onVerdict,verdictPending}:{g:GameStateView;me:PlayerView;partner?:PlayerView;connected:boolean;onPowers:()=>void;onRules:()=>void;onClaimMission:()=>void;onDrawMission:()=>void;claiming:boolean;onVerdict:()=>void;verdictPending:boolean}){
 const t=useTranslations('hud'),tw=useTranslations('twists'),tconn=useTranslations('connection'),tc=useTranslations('common');const heat=useHeat();
 const [missionOpen,setMissionOpen]=useState(false);const ready=g.inventory.filter(p=>p.usable).length,armed=g.inventory.some(p=>p.status==='ARMED');
 const partnerName=partner?.nickname||tc('yourPartner');
 const mine=g.scores[me.id]||0,theirs=partner?g.scores[partner.id]||0:0;const mineTick=useRiseTick(mine),theirsTick=useRiseTick(theirs),powerTick=useRiseTick(g.inventory.length);
 // An open draw (a mission, or the Power Card a confirmed one earned) takes the mission button until it is drawn.
 const drawOpen=!!(g.draws?.POWER||(!g.mission&&g.draws?.MISSION));
 const missionLabel=drawOpen?t('missionDraw'):!g.mission?(g.missionsLeft===0?t('missionsDone'):t('mission')):g.mission.status==='DECLARED'?t('missionDeclared'):t('missionProgress',{number:g.mission.number,total:g.mission.total});
 return <header className="flex-none px-3 pt-[max(.6rem,var(--safe-top))]">
  <div className="mx-auto max-w-lg">
   <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] font-bold uppercase tracking-[.14em]"><span className="shrink-0">{t('round',{round:g.round})}<span className="text-ivory/55"> / {g.totalRounds}</span></span><span className="text-ivory/65">{heat.label(g.heat)}</span></div>
     <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory/15"><div className="h-full rounded-full bg-crimson transition-[width] duration-500" style={{width:`${g.round/g.totalRounds*100}%`}}/></div></div>
    <div className="flex items-center gap-1 rounded-[10px] border-2 border-ivory/20 px-2.5 py-1" aria-label={t('sparksAria',{mine:g.scores[me.id]||0,name:partnerName,theirs:partner?g.scores[partner.id]||0:0})}>
     <Sparkles size={14} className="text-pink"/><span key={`m${mineTick}`} className={`display text-lg tabular-nums leading-none ${mineTick?'fx-spark-tick':''}`}>{mine}</span><span className="text-[10px] text-ivory/50">{t('vs')}</span><span key={`t${theirsTick}`} className={`display text-lg tabular-nums leading-none text-ivory/70 ${theirsTick?'fx-spark-tick':''}`}>{theirs}</span>
    </div>
    <ChemistrySignal announce state={connected?'live':'lost'} label={connected?tconn('statusConnected'):tconn('statusReconnecting')}/>
    <LanguageSwitcher variant="compact"/>
    <IconButton label={t('rules')} size="sm" className="hud-help" onClick={onRules}><CircleHelp/></IconButton>
   </div>

   <div className="mt-2 flex gap-2">
    {/* An open draw waits here, never over the card in play; it draws the eye once when it opens. */}
    {drawOpen?<button key={g.draws?.POWER?'power':'mission'} onClick={onDrawMission} data-active className={ctaClass({variant:'utility',size:'sm',className:'fx-cta-attention !min-h-10 min-w-0 flex-1 !justify-start text-left'})}>
     <Layers size={14} className="shrink-0 text-pink"/><span className="truncate">{g.draws?.POWER?t('powerDraw'):missionLabel}</span>
    </button>:<button onClick={()=>setMissionOpen(o=>!o)} aria-expanded={missionOpen} aria-controls="mission-panel" className={ctaClass({variant:'utility',size:'sm',className:'!min-h-10 min-w-0 flex-1 !justify-start text-left'})}>
     <Lock size={14} className="shrink-0 text-pink"/><span className="truncate">{missionLabel}</span><ChevronDown size={14} className={`ml-auto shrink-0 transition ${missionOpen?'rotate-180':''}`}/>
    </button>}
    <button onClick={onPowers} data-active={armed||ready>0} className={ctaClass({variant:'utility',size:'sm',className:'!min-h-10 shrink-0'})} aria-label={ready?t('powerAriaUsable',{count:g.inventory.length,limit:g.inventoryLimit,usable:ready}):t('powerAria',{count:g.inventory.length,limit:g.inventoryLimit})}>
     <Crown size={15} strokeWidth={1.8}/><span className="max-[399px]:sr-only">{t('power')}</span><span key={`p${powerTick}`} className={powerTick?'fx-spark-tick':''}>{g.inventory.length}/{g.inventoryLimit}</span>{ready>0&&!armed&&<span className="rounded-[6px] bg-crimson px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ivory">{t('use')}</span>}{armed&&<span className="rounded-[6px] bg-crimson px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ivory">{t('armed')}</span>}
    </button>
   </div>
   {missionOpen&&!drawOpen&&<MissionPanel key={g.mission?.id||'done'} g={g} partnerName={partnerName} onClaim={onClaimMission} claiming={claiming}/>}
   {verdictPending&&<Button key={g.opponentMissionDeclared?.id} variant="secondary" size="sm" block className="fx-cta-attention mt-2" onClick={onVerdict}>{t('verdictChip',{name:partnerName})}</Button>}
   {g.pendingTwist&&<p className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-plum px-3 py-1.5 text-[11px] font-bold"><Zap size={13} className="shrink-0 text-pink"/><span className="truncate">{t('twistPending',{twists:tw(`${g.pendingTwist}.title`)})}</span></p>}
   {partner&&!partner.connected&&<p className="mt-2 rounded-[10px] border-2 border-pink/50 px-3 py-1.5 text-center text-[11px]">{t('partnerAway',{name:partner.nickname})}</p>}
  </div>
 </header>;
}

function MissionPanel({g,partnerName,onClaim,claiming}:{g:GameStateView;partnerName:string;onClaim:()=>void;claiming:boolean}){
 const t=useTranslations('hud');const [peek,setPeek]=useState(false);const m=g.mission;
 return <section id="mission-panel" className="mission-panel pop-in mt-2 p-3">
  <div className="flex items-center justify-between gap-2 border-b border-ivory/15 pb-2"><p className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[.25em] text-pink"><TypeEmblem type="SECRET_MISSION" size="tray" className="-my-1.5 -ml-1.5 -mr-1"/>{t('eyesOnly')}</p>{m&&<Button variant="ghost" size="sm" aria-pressed={peek} icon={peek?<EyeOff/>:<Eye/>} onClick={()=>setPeek(p=>!p)}>{peek?t('hide'):t('reveal')}</Button>}</div>
  {!m?<p className="mt-2 text-sm">{t('allDone')}</p>:<>
   <p className={`mt-1.5 text-[15px] font-medium leading-6 transition ${peek?'':'select-none blur-[6px]'}`} aria-hidden={!peek}>{m.text}</p>
   <p className="mt-2 text-xs leading-5 text-ivory/80">{t('missionHow',{name:partnerName})}</p>
   {m.notYetCount>0&&m.status==='ACTIVE'&&<p className="mt-2 text-xs font-bold text-pink">{t('notYetSaid')}</p>}
   {m.status==='ACTIVE'&&<Button variant="primary" size="md" block className="mt-3" loading={claiming} loadingLabel={t('asking')} onClick={onClaim}>{t('ask')}</Button>}
   {m.status==='DECLARED'&&<WaitStatus>{t('asked',{name:partnerName})}</WaitStatus>}
  </>}
 </section>;
}
