'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {ArrowLeftRight,Eye,Flame,Heart,Lock,Timer,X,Zap,type LucideIcon} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {DesireChoice,GameStateView} from '@after-dark/contracts';
import {titleLength,usePool} from '@/lib/copy';
import {ChoiceButton} from '../ui/choice-button';
import {EventFlash} from '../ui/event-fx';
import {ChemistryCountdown,useDuration} from './chemistry-countdown';

/** `of` names a player from this viewer's side ("You" for themselves); `isMe` drives verb forms that depend on it. */
export type Names={me:string;partner:string;of:(id:string)=>string;isMe:(id:string)=>boolean};
export type CardProps={g:GameStateView;meId:string;names:Names;selected:number|null;setSelected:(n:number)=>void;desire:DesireChoice|null;setDesire:(d:DesireChoice)=>void};
const CATEGORY:Record<string,{icon:LucideIcon;tone:string}>={MIND_READER:{icon:Eye,tone:'crimson'},CHEMISTRY:{icon:Flame,tone:'pink'},MUTUAL_DESIRE:{icon:Heart,tone:'plum'},PLOT_TWIST:{icon:Zap,tone:'ink'}};
const bold=(chunks:ReactNode)=><strong>{chunks}</strong>;
const self=(yes:boolean)=>yes?'yes':'no';

export function PlayCard(props:CardProps){
 const {g}=props;const meta=CATEGORY[g.card.type]||CATEGORY.MIND_READER,Icon=meta.icon;const t=useTranslations('card'),tt=useTranslations('cardType');
 return <article key={`${g.round}`} className="play-card card-frame pop-in relative mx-auto w-full max-w-lg text-obsidian" aria-label={t('aria',{type:tt(g.card.type)})} data-card-type={g.card.type}>
  <header className="play-card-header">
   <div className="card-masthead" data-tone={meta.tone}>
    <span className="card-masthead-index" aria-hidden>{String(g.round).padStart(2,'0')}</span>
    <span className="card-masthead-category"><Icon aria-hidden size={14}/><span>{tt(g.card.type)}</span></span>
   </div>
  </header>
  <div className="px-2 pb-3 pt-2 sm:px-3">{body(props)}</div>
 </article>;
}

function body(p:CardProps){if(p.g.card.type==='MIND_READER')return <MindReader {...p}/>;if(p.g.card.type==='CHEMISTRY')return <Chemistry {...p}/>;if(p.g.card.type==='MUTUAL_DESIRE')return <MutualDesire {...p}/>;return <PlotTwist {...p}/>}
const Title=({children}:{children:string})=><h1 className="game-card-title" data-length={titleLength(children)}>{children}</h1>;
const Eyebrow=({children,tone='text-crimson'}:{children:ReactNode;tone?:string})=><p className={`text-[11px] font-bold uppercase tracking-[.2em] ${tone}`}>{children}</p>;
const Note=({children}:{children:ReactNode})=><p className="mt-3 text-[13px] leading-5 text-obsidian/75">{children}</p>;
/** Event headline: `strong` unveils for wins and big moments, `soft` simply rises in for quieter outcomes. */
function Headline({text,tone='text-crimson',reveal='strong'}:{text:string;tone?:string;reveal?:'strong'|'soft'}){return <p className={`display text-[clamp(1.9rem,11cqi,3rem)] ${reveal==='strong'?'fx-headline':'fx-headline-soft'} ${tone}`}>{text}</p>}

function MindReader({g,meId,names,selected,setSelected}:CardProps){
 const t=useTranslations('card.mr'),tcard=useTranslations('card'),pick=usePool();
 const isSecret=g.secretPlayerId===meId,hiding=g.phase==='WAITING_FOR_SECRET',guessing=g.phase==='WAITING_FOR_GUESS';
 const canChoose=(isSecret&&hiding)||(!isSecret&&guessing);
 const r=g.result;
 if(g.phase==='REVEAL'&&r){
  const correct=!!r.correct;const pool=correct?(isSecret?'correctHolder':'correctGuesser'):(isSecret?'wrongHolder':'wrongGuesser');
  return <div>
   {correct&&<EventFlash tone="rose"/>}
   <Headline text={pick(pool,r.variant)} tone={correct?'text-crimson':'text-plum'} reveal={correct?'strong':'soft'}/>
   <p className={`mt-1 text-sm font-bold ${correct?'fx-spark-tick':''}`} style={correct?{animationDelay:'.45s'}:undefined}>{correct?t('sparksFor',{self:self(names.isMe(g.guessingPlayerId)),count:r.sparksEarned??0,name:names.of(g.guessingPlayerId)}):isSecret?t('noSparkHolder'):t('noSpark')}</p>
   {r.firstMiss!==undefined&&<p className="mt-1 text-xs text-obsidian/75">{t('secondChanceUsed',{choice:g.card.choices[r.firstMiss]})}</p>}
   {r.powersUsed?.includes('DOUBLE_SPARK')&&<p className="mt-1 text-xs text-obsidian/75">{correct?t('doubleUsedHit'):t('doubleUsedMiss')}</p>}
   <p className="mt-3 text-sm font-medium text-obsidian/80">{g.card.question}</p>
   <ul className="mt-2 space-y-1.5">{g.card.choices.map((c,i)=>{const hidden=i===r.secretChoice,guessed=i===r.guessChoice;return <li key={i} data-secret={hidden||undefined} data-guess={guessed||undefined} className={`flex items-center gap-3 rounded-[12px] border-2 px-3 py-2 text-sm font-bold ${hidden&&correct?'fx-answer-hit ':''}${hidden?'border-crimson bg-crimson text-ivory':guessed?'border-obsidian':'border-obsidian/10 text-obsidian/55'}`}><span className="display text-base">{String.fromCharCode(65+i)}</span><span className="min-w-0 flex-1">{c}</span>
    <span className="flex shrink-0 flex-col items-end text-right text-[9px] uppercase tracking-wider">{hidden&&<span>{isSecret?t('yourAnswer'):t('theirAnswer',{name:names.partner})}</span>}{guessed&&<span>{isSecret?t('theirGuess',{name:names.partner}):t('yourGuess')}</span>}</span></li>})}</ul>
   {g.forfeit&&<Forfeit g={g} meId={meId} names={names}/>}
  </div>;
 }
 const chooser=names.of(g.secretPlayerId),reader=names.of(g.guessingPlayerId);
 const roleTitle=isSecret?t('roleSecretTitle'):t('roleReaderTitle');
 const roleBody=isSecret?(hiding?t('roleSecretBody',{name:reader}):t('roleSecretWaiting',{name:reader}))
  :(hiding?t('roleReaderWaiting',{name:chooser}):t('roleReaderBody',{name:chooser}));
 return <div>
  {g.eliminatedChoice!==undefined&&<EventFlash key={`miss-${g.eliminatedChoice}`} tone="rose"/>}
  {g.twistNotice&&<TwistBanner g={g} names={names}/>}
  <div className="card-role-context">
   <p className="card-role-title">{roleTitle}</p>
   <p className="card-role-body">{roleBody}</p>
  </div>
  <div className="mt-3"><Title>{g.card.question}</Title></div>
  {/* Answers are keyed by index: the same position means the same answer in every language. */}
  <div className="mt-4 space-y-2" role="radiogroup" aria-label={tcard('answers')}>{g.card.choices.map((c,i)=>{const mine=isSecret&&g.mySecretChoice===i,crossed=g.eliminatedChoice===i,on=selected===i;
   // Selected = picked locally, not yet sent (outline). Locked = the server holds it (solid).
   return <ChoiceButton key={i} keyLabel={String.fromCharCode(65+i)} selected={on} state={mine?'locked':crossed?'crossed':undefined} disabled={!canChoose||crossed} onClick={()=>setSelected(i)}
    tag={mine?<><Lock size={11}/>{t('lockedIn')}</>:crossed?<><X size={12}/>{t('notThisOne')}</>:on?t('selected'):undefined}>{c}</ChoiceButton>})}</div>
  <div className="card-editorial-footer">
   <Note>{canChoose?(isSecret?t('noteHide',{name:names.partner}):t('noteGuess',{name:names.partner,count:g.sparkValue}))
    :isSecret?t('noteLocked',{name:names.partner}):t('noteWaitGuess')}</Note>
   <p className="card-stake">{t('stake',{count:g.sparkValue})}</p>
  </div>
 </div>;
}

function TwistBanner({g,names}:{g:GameStateView;names:Names}){
 const t=useTranslations('card.twistBanner');const n=g.twistNotice!;
 return <div className="pop-in fx-ember-sweep mb-3 rounded-[12px] bg-obsidian p-3 text-ivory"><p className="relative z-[2] flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-pink"><ArrowLeftRight size={12}/>{n.source==='PLOT_TWIST'?t('plot'):t('power',{self:self(names.isMe(n.byPlayerId||'')),name:names.of(n.byPlayerId||'')})}</p>
  <p className="relative z-[2] mt-1 text-sm leading-5">{t.rich('body',{b:bold,normal:names.of(n.normalSecretPlayerId),secret:names.of(n.secretPlayerId),self:self(names.isMe(n.secretPlayerId))})}</p></div>;
}

function Forfeit({g,meId,names}:{g:GameStateView;meId:string;names:Names}){
 const t=useTranslations('card.forfeit');const f=g.forfeit!,payer=f.payerId===meId,name=names.partner;
 const status=f.stage==='ACCEPTED'?(payer?t('acceptedPayer'):t('acceptedCollector',{name})):f.stage==='PASSED'?t('passed'):f.stage==='WAITING'?t('waiting',{name}):payer?t('offeredPayer'):t('offeredCollector',{name});
 const offered=f.stage==='OFFERED'||f.stage==='WAITING';
 // The forfeit lands below the answers: bring it into view once, gently (instantly under reduced motion).
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=panel.current;if(!el)return;const calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const id=setTimeout(()=>el.scrollIntoView({block:'nearest',behavior:calm?'auto':'smooth'}),calm?0:350);return()=>clearTimeout(id)},[]);
 return <div ref={panel} className="fx-card-lift relative overflow-hidden rounded-[14px] border-2 border-dashed border-plum p-3 mt-3" style={{['--fx-delay' as string]:'.35s'}}>{f.stage==='OFFERED'&&<EventFlash tone="ember"/>}
  {offered&&<p className="display fx-headline mb-1 text-[clamp(1.3rem,7cqi,1.8rem)] text-crimson">{t('headline')}</p>}<p className="text-[10px] font-bold uppercase tracking-[.2em] text-plum">{t('label')}</p><p className="mt-1 text-[15px] font-bold leading-snug">{f.text}</p><p className="mt-1.5 text-xs leading-5 text-obsidian/75">{status}</p></div>;
}

function Chemistry({g}:CardProps){
 const t=useTranslations('card.chem'),pick=usePool(),duration=useDuration();
 const c=g.chemistry,stage=c?.stage||'INVITATION',v=g.result?.variant||0;
 if(stage==='COMPLETED')return <div><ChemistryPhaseCaption phase="COMPLETED" count={c?.sparksEach||1}/><p className="mt-3 text-sm text-obsidian/75">{g.card.question}</p></div>;
 if(stage==='DECLINED')return <div><Headline text={pick('chemistryDeclined',v)} tone="text-plum" reveal="soft"/><Note>{t('declinedNote')}</Note></div>;
 if(stage==='SKIPPED')return <div><Headline text={pick('chemistryStopped',v)} tone="text-plum" reveal="soft"/><Note>{t('stoppedNote')}</Note></div>;
 const phase=stage==='INVITATION'||stage==='WAITING_FOR_CONSENT'?'CONSENT'
  :stage==='MUTUALLY_ACCEPTED'?'READY'
  :stage==='WAITING_TO_START'?'STARTING'
  :stage==='WAITING_FOR_COMPLETION'?'WAITING'
  :c?.partnerFinished?'CONFIRM':'ACTIVE';
 const live=phase==='ACTIVE'||phase==='CONFIRM'||phase==='WAITING';
 // The clock exists only once both pressed start; before that the card just says how long it will run.
 const seconds=c?.durationSeconds??g.card.durationSeconds;
 return <div>
  <ChemistryPhaseCaption phase={phase}/>
  <div className="mt-3"><Title>{g.card.question}</Title></div>
  {g.card.challenge&&<p className={`mt-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium leading-6 ${live?'bg-obsidian text-ivory':'bg-obsidian/5'}`}>{g.card.challenge}</p>}
  {live&&c?.endsAt&&seconds?<ChemistryCountdown key={c.startedAt} endsAt={c.endsAt} durationSeconds={seconds} serverNow={c.serverNow} expired={c.timerExpired}/>
   :!live&&seconds?<p className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-obsidian/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-obsidian/75"><Timer size={13} aria-hidden className="text-crimson"/>{t('timer.chip',{duration:duration(seconds)})}</p>:null}
 </div>;
}

function ChemistryPhaseCaption({phase,count=1}:{phase:'CONSENT'|'READY'|'STARTING'|'ACTIVE'|'CONFIRM'|'WAITING'|'COMPLETED';count?:number}){
 const t=useTranslations('card.chem');
 const description=phase==='COMPLETED'?t('phase.COMPLETED.description',{count}):t(`phase.${phase}.description`);
 return <div key={phase} className="chem-phase-caption" role="status" aria-live="polite">
  <Flame aria-hidden className="chem-phase-icon"/>
  <div className="min-w-0"><p className="chem-phase-title">{t(`phase.${phase}.title`)}</p><p className="chem-phase-description">{description}</p></div>
 </div>;
}

function MutualDesire({g,desire,setDesire}:CardProps){
 const t=useTranslations('card.desire'),pick=usePool();
 if(g.phase==='MUTUAL_DESIRE_REVEAL'){const yes=!!g.result?.mutualUnlocked;return <div>{yes&&<EventFlash tone="rose"/>}<Headline text={pick(yes?'mutualYes':'mutualNo',g.result?.variant)} tone={yes?'text-crimson':'text-plum'} reveal={yes?'strong':'soft'}/><p className={`mt-2 text-sm font-medium ${yes?'fx-reward-glow rounded-[12px] px-3 py-2':''}`}>{g.card.question}</p><Note>{yes?t('yesNote'):t('noNote')}</Note></div>}
 return <div>
  <Eyebrow tone="text-plum">{t('eyebrow')}</Eyebrow>
  <div className="mt-1.5"><Title>{g.card.question}</Title></div>
  {g.hasSubmittedChoice?<p className="mt-4 rounded-[12px] bg-obsidian px-3 py-3 text-sm text-ivory"><Lock size={14} className="-mt-0.5 mr-1.5 inline text-pink"/>{t('sealed')}</p>
   :<div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('group')}>{(['YES','MAYBE','NO'] as const).map(v=><ChoiceButton key={v} tile selected={desire===v} onClick={()=>setDesire(v)}>{t(v)}</ChoiceButton>)}</div>}
  <Note>{t('note')}</Note>
 </div>;
}

function PlotTwist({g,names}:CardProps){
 const t=useTranslations('card.twist'),tw=useTranslations('twists'),pick=usePool();
 const effect=g.card.effect||'FRESH_START',done=g.phase==='ROUND_COMPLETE';
 const next=g.nextMindReaderSecretId,nextName=names.of(next),otherIsMe=!names.isMe(next),otherName=otherIsMe?names.me:names.partner;
 if(done&&g.result?.skipped)return <div><Headline text={pick('skipped',g.result.variant)} tone="text-plum" reveal="soft"/><Note>{t('skippedNote')}</Note></div>;
 return <div>
  {done&&<EventFlash tone="ember"/>}
  <Eyebrow>{done?t('activated'):t('turn')}</Eyebrow>
  {/* Branded headline from the card, then the functional effect name and its exact rules. */}
  <p className="display fx-headline mt-1.5 text-[clamp(2rem,12cqi,3.2rem)]">{g.card.question}</p>
  <p className="mt-1 text-[15px] font-bold uppercase tracking-[.14em] text-crimson">{tw(`${effect}.title`)}</p>
  <div key={done?'on':'off'} className={`mt-3 rounded-[12px] bg-obsidian p-3 text-sm leading-6 text-ivory ${done?'fx-reward-glow':'fx-card-lift'}`} style={done?undefined:{['--fx-delay' as string]:'.3s'}}>
   {effect==='ROLE_REVERSAL'?t.rich('roleReversal',{b:bold,next:nextName,other:otherName,nextSelf:self(names.isMe(next)),otherSelf:self(otherIsMe)})
    :effect==='DOUBLE_SPARK'?t.rich('doubleSpark',{b:bold}):tw(`${effect}.effect`)}
  </div>
  <Note>{done?(g.result?.twistAlreadyPending?t('alreadyPending'):tw(`${effect}.applied`)):t('pendingNote')}</Note>
 </div>;
}
