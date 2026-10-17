'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeftRight,CircleHelp,Flame,Lock,Timer} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {DesireChoice,GameAction,GameStateView,QuestionView} from '@after-dark/contracts';
import {titleLength,usePool} from '@/lib/copy';
import {useHeat} from '@/lib/games';
import {playCue} from '@/lib/sound';
import {useLocaleSwitch} from '@/i18n/locale-provider';
import {Button} from '../ui/button';
import {ChoiceButton} from '../ui/choice-button';
import {EventFlash} from '../ui/event-fx';
import {ChemistryCountdown,useDuration} from './chemistry-countdown';
import {DrawDeck} from './draw-deck';
import {TypeEmblem} from './type-emblem';

/** `of` names a player from this viewer's side ("You" for themselves); `isMe` drives verb forms that depend on it. */
export type Names={me:string;partner:string;of:(id:string)=>string;isMe:(id:string)=>boolean};
/** Card-local answers (questions, follow-ups, Bonus Moments) go through `send`; `pending` blocks repeat taps while one is in flight. */
export type CardProps={g:GameStateView;meId:string;names:Names;selected:number|null;setSelected:(n:number)=>void;desire:DesireChoice|null;setDesire:(d:DesireChoice)=>void;
 prediction:number|null;setPrediction:(n:number)=>void;questionText:string;setQuestionText:(s:string)=>void;replyText:string;setReplyText:(s:string)=>void;
 send:(type:GameAction['type'],extra?:Partial<GameAction>)=>void;pending:boolean};
const CATEGORY:Record<string,{tone:string}>={MIND_READER:{tone:'crimson'},CHEMISTRY:{tone:'pink'},MUTUAL_DESIRE:{tone:'plum'},PLOT_TWIST:{tone:'ink'},FORFEIT:{tone:'pink'}};
const bold=(chunks:ReactNode)=><strong>{chunks}</strong>;
const self=(yes:boolean)=>yes?'yes':'no';

const slug=(type:string)=>type.toLowerCase().replace(/_/g,'-');
const dealtKey=(gameId:string,round:number)=>`after-dark:dealt:${gameId}:${round}`;
/** A card is dealt face down once per round on this device (not on a reload, a language switch or Double Challenge part B), never under reduced motion. */
function dealFaceDown(gameId:string,round:number){
 try{return !window.matchMedia('(prefers-reduced-motion: reduce)').matches&&sessionStorage.getItem(dealtKey(gameId,round))!=='1'}catch{return false}
}
const markDealt=(gameId:string,round:number)=>{try{sessionStorage.setItem(dealtKey(gameId,round),'1')}catch{}};

/** The card stage: each round's card arrives on its back (public/images/card-back/{locale}), then turns over to its front. */
export function PlayCard(props:CardProps){
 return <div className="card-stage"><DealtCard key={props.g.round} {...props}/></div>;
}

function DealtCard(props:CardProps){
 const {g}=props;const {locale}=useLocaleSwitch();
 const [face,setFace]=useState<'back'|'turning'|'front'>(()=>dealFaceDown(g.id,g.round)?'back':'front');
 const [turned,setTurned]=useState(false);
 useEffect(()=>markDealt(g.id,g.round),[g.id,g.round]);
 // The back always gives way, even if an animation event never arrives.
 useEffect(()=>{if(face==='front')return;const id=setTimeout(()=>{setFace('front');setTurned(true)},2000);return()=>clearTimeout(id)},[face]);
 if(face==='front')return <CardFront {...props} turned={turned}/>;
 return <div aria-hidden className={`card-back ${face==='turning'?'card-back-turning':''}`} data-card-type={g.card.type}
  onClick={()=>setFace('turning')} onAnimationEnd={e=>{if(e.animationName==='card-turn-out'){setFace('front');setTurned(true);playCue('flip')}}}>
  <Image src={`/images/card-back/${locale}/${slug(g.card.type)}.webp`} alt="" fill sizes="(max-width: 560px) 100vw, 512px" priority draggable={false}/>
 </div>;
}

/** The front: a plain face in the type's tint with the card's own content. */
function CardFront(props:CardProps&{turned:boolean}){
 const {g,turned}=props;const displayType=g.phase==='REVEAL'&&g.forfeit?'FORFEIT':g.card.type;const meta=CATEGORY[displayType]||CATEGORY.MIND_READER;const t=useTranslations('card'),tt=useTranslations('cardType');
 return <article className={`play-card card-face naughty-card-surface relative text-obsidian ${turned?'card-turn-in':'pop-in'}`} aria-label={t('aria',{type:tt(displayType)})} data-card-type={displayType}>
  <header className="play-card-header">
   <div className="card-masthead" data-tone={meta.tone}>
    <span className="card-masthead-index" aria-hidden>{String(g.round).padStart(2,'0')}</span>
    <span className="card-masthead-category"><span>{tt(displayType)}</span></span>
    <TypeEmblem type={displayType} size="header" className="card-masthead-emblem"/>
   </div>
  </header>
  <div className="pt-2">{body(props)}</div>
 </article>;
}

function body(p:CardProps){if(p.g.card.type==='MIND_READER')return <MindReader {...p}/>;if(p.g.card.type==='CHEMISTRY')return <Chemistry {...p}/>;if(p.g.card.type==='MUTUAL_DESIRE')return <MutualDesire {...p}/>;return <PlotTwist {...p}/>}
const Title=({children}:{children:string})=><h1 className="game-card-title" data-length={titleLength(children)}>{children}</h1>;
const Eyebrow=({children,tone='text-crimson'}:{children:ReactNode;tone?:string})=><p className={`text-[11px] font-bold uppercase tracking-[.2em] ${tone}`}>{children}</p>;
const Note=({children}:{children:ReactNode})=><p className="mt-3 text-[13px] leading-5 text-obsidian/75">{children}</p>;
/** Event headline: `strong` unveils for wins and big moments, `soft` simply rises in for quieter outcomes. */
function Headline({text,tone='text-crimson',reveal='strong'}:{text:string;tone?:string;reveal?:'strong'|'soft'}){return <p className={`display text-[clamp(1.9rem,11cqi,3rem)] ${reveal==='strong'?'fx-headline':'fx-headline-soft'} ${tone}`}>{text}</p>}

const letter=(i:number)=>String.fromCharCode(65+i);
const Label=({children}:{children:ReactNode})=><p className="text-[10px] font-bold uppercase tracking-[.2em] text-crimson">{children}</p>;
/** Inline answer pair on the ivory card: a quiet decline beside the main answer. */
function AnswerPair({no,yes,onNo,onYes,pending}:{no:string;yes:string;onNo:()=>void;onYes:()=>void;pending:boolean}){
 return <div className="mt-2 flex flex-col-reverse gap-2 min-[360px]:flex-row"><Button variant="ghost" size="md" disabled={pending} onClick={onNo}>{no}</Button><Button variant="primary" size="md" className="flex-1" disabled={pending} onClick={onYes}>{yes}</Button></div>;
}

function MindReader(p:CardProps){
 const {g,meId,names,selected,setSelected}=p;
 const t=useTranslations('card.mr'),tcard=useTranslations('card'),tw=useTranslations('twists'),pick=usePool();
 const isSecret=g.secretPlayerId===meId,hiding=g.phase==='WAITING_FOR_SECRET',guessing=g.phase==='WAITING_FOR_GUESS',asking=g.phase==='QUESTION_TIME';
 const canChoose=(isSecret&&hiding)||(!isSecret&&guessing);
 if(g.pickyKitty)return <PickyKitty {...p}/>;
 if(g.phase==='COUNTER_MIND_SUBMIT')return <CounterMind {...p}/>;
 const r=g.result;
 if(g.phase==='REVEAL'&&r&&r.secretChoice===undefined)return <><CounterReveal {...p}/><AfterReveal {...p}/></>;
 // Once a miss opens a forfeit, the card becomes the draw table. The resolved choices stay in state but no longer compete
 // with the next playable moment on screen.
 if(g.phase==='REVEAL'&&r&&g.forfeit)return <Forfeit key={g.forfeit.payerId} g={g} meId={meId} names={names} send={p.send} pending={p.pending}/>;
 if(g.phase==='REVEAL'&&r){
  const correct=!!r.correct;const pool=correct?(isSecret?'correctHolder':'correctGuesser'):(isSecret?'wrongHolder':'wrongGuesser');
  const partA=r.part===2?r.predictions?.[0]:undefined,last=r.predictions?.at(-1);
  return <div>
   {correct&&<EventFlash tone="rose"/>}
   {r.part&&<Label>{t('partLabel',{part:r.part})}</Label>}
   <Headline text={pick(pool,r.variant)} tone={correct?'text-crimson':'text-plum'} reveal={correct?'strong':'soft'}/>
   <p className={`mt-1 text-sm font-bold ${correct?'fx-spark-tick':''}`} style={correct?{animationDelay:'.45s'}:undefined}>{correct?t('sparksFor',{self:self(names.isMe(g.guessingPlayerId)),count:r.sparksEarned??0,name:names.of(g.guessingPlayerId)}):isSecret?t('noSparkHolder'):t('noSpark')}</p>
   {partA&&<p className="mt-1 text-xs text-obsidian/75">{t('partA',{self:self(names.isMe(partA.guesserId)),name:names.of(partA.guesserId),correct:partA.correct?'yes':'no'})}</p>}
   {last?.category==='HINTED'&&<p className="mt-1 text-xs text-obsidian/75">{t('assisted')}</p>}
   <p className="mt-3 text-sm font-medium text-obsidian/80">{g.card.question}</p>
   <ul className="mt-2 space-y-1.5">{g.card.choices.map((c,i)=>{const hidden=i===r.secretChoice,guessed=i===r.guessChoice;return <li key={i} data-secret={hidden||undefined} data-guess={guessed||undefined} className={`flex items-center gap-3 rounded-[12px] border-2 px-3 py-2 text-sm font-bold ${hidden&&correct?'fx-answer-hit ':''}${hidden?'border-crimson bg-crimson text-ivory':guessed?'border-obsidian':'border-obsidian/10 text-obsidian/55'}`}><span className="display text-base">{String.fromCharCode(65+i)}</span><span className="min-w-0 flex-1">{c}</span>
    <span className="flex shrink-0 flex-col items-end text-right text-[9px] uppercase tracking-wider">{hidden&&<span>{isSecret?t('yourAnswer'):t('theirAnswer',{name:names.partner})}</span>}{guessed&&<span>{isSecret?t('theirGuess',{name:names.partner}):t('yourGuess')}</span>}</span></li>})}</ul>
   {g.forfeit&&<Forfeit key={g.forfeit.payerId} g={g} meId={meId} names={names} send={p.send} pending={p.pending}/>}
   <AfterReveal {...p}/>
  </div>;
 }
 const chooser=names.of(g.secretPlayerId),reader=names.of(g.guessingPlayerId);
 const roleTitle=isSecret?t('roleSecretTitle'):t('roleReaderTitle');
 const roleBody=isSecret?(hiding?t('roleSecretBody',{name:reader}):t('roleSecretWaiting',{name:reader}))
  :(hiding?t('roleReaderWaiting',{name:chooser}):t('roleReaderBody',{name:chooser}));
 return <div>
  {g.twistNotice&&<TwistBanner g={g} names={names}/>}
  {g.twistSkipped&&<p role="status" className="mb-3 rounded-[12px] bg-obsidian/5 px-3 py-2 text-[13px] leading-5">{tcard('twistBanner.skipped',{twist:tw(`${g.twistSkipped}.title`)})}</p>}
  <div className="card-role-context">
   <p className="card-role-title">{roleTitle}</p>
   <p className="card-role-body">{roleBody}</p>
  </div>
  <div className="mt-3"><Title>{g.card.question}</Title></div>
  {/* Answers are keyed by index: the same position means the same answer in every language. */}
  <div className="mt-4 space-y-2" role="radiogroup" aria-label={tcard('answers')}>{g.card.choices.map((c,i)=>{const mine=isSecret&&g.mySecretChoice===i,on=selected===i;
   // Selected = picked locally, not yet sent (outline). Locked = the server holds it (solid).
   return <ChoiceButton key={i} keyLabel={letter(i)} selected={on} state={mine?'locked':undefined} disabled={!canChoose} onClick={()=>setSelected(i)}
    tag={mine?<><Lock size={11}/>{t('lockedIn')}</>:on?t('selected'):undefined}>{c}</ChoiceButton>})}</div>
  {asking&&<QuestionTime {...p}/>}
  <div className="card-editorial-footer">
   {!asking&&<Note>{canChoose?(isSecret?t('noteHide',{name:names.partner}):t('noteGuess',{name:names.partner,count:g.sparkValue}))
    :isSecret?t('noteLocked',{name:names.partner}):t('noteWaitGuess')}</Note>}
   <p className="card-stake">{t('stake',{count:g.sparkValue})}</p>
  </div>
 </div>;
}

/** The twist shaping this Mind Reader card, named the same way on both phones. */
function TwistBanner({g,names}:{g:GameStateView;names:Names}){
 const t=useTranslations('card.twistBanner'),tw=useTranslations('twists');const n=g.twistNotice!;
 const secret={b:bold,secret:names.of(n.secretPlayerId),self:self(names.isMe(n.secretPlayerId))};
 const body=n.kind==='ROLE_REVERSAL'?t.rich('body',{...secret,normal:names.of(n.normalSecretPlayerId)})
  :n.kind==='DOUBLE_CHALLENGE'?(g.challengePart===2?t.rich('partB',secret):t('partA'))
  :n.kind==='COUNTER_MIND'?t('counter'):t('question');
 const Icon=n.kind==='ONE_MORE_QUESTION'?CircleHelp:ArrowLeftRight;
 return <div className="pop-in fx-ember-sweep mb-3 rounded-[12px] bg-obsidian p-3 text-ivory"><p className="relative z-[2] flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-pink"><Icon size={12}/>{t('plot',{twist:tw(`${n.kind}.title`)})}</p>
  <p className="relative z-[2] mt-1 text-sm leading-5">{body}</p></div>;
}

/** Counter Mind: two private picks, your own answer and your guess for your partner, sealed together. */
function CounterMind({g,names,selected,setSelected,prediction,setPrediction}:CardProps){
 const t=useTranslations('card.mr');const c=g.counterMind,done=!!c?.iSubmitted;
 const group=(label:string,value:number|null,locked:number|undefined,set:(n:number)=>void)=><div className="mt-4"><p className="card-role-title">{label}</p>
  <div className="mt-2 space-y-2" role="radiogroup" aria-label={label}>{g.card.choices.map((ch,i)=>{const mine=locked===i,on=!done&&value===i;
   return <ChoiceButton key={i} keyLabel={letter(i)} selected={on} state={mine?'locked':undefined} disabled={done} onClick={()=>set(i)} tag={mine?<><Lock size={11}/>{t('lockedIn')}</>:on?t('selected'):undefined}>{ch}</ChoiceButton>})}</div></div>;
 return <div>
  {g.twistNotice&&<TwistBanner g={g} names={names}/>}
  <div className="mt-1"><Title>{g.card.question}</Title></div>
  {group(t('counterAnswer'),selected,c?.myChoice,setSelected)}
  {group(t('counterPrediction',{name:names.partner}),prediction,c?.myPrediction,setPrediction)}
  <div className="card-editorial-footer"><Note>{done?t('counterSealed',{name:names.partner}):t('counterNote',{name:names.partner})}</Note><p className="card-stake">{t('stake',{count:g.sparkValue})}</p></div>
 </div>;
}

/** Counter Mind reveal: both predictions, each judged on its own. */
function CounterReveal({g,meId,names,send,pending}:CardProps){
 const t=useTranslations('card.mr'),pick=usePool();const r=g.result!,predictions=r.predictions||[];
 const correct=!!predictions.find(x=>x.guesserId===meId)?.correct;
 return <div>
  {correct&&<EventFlash tone="rose"/>}
  <Headline text={pick(correct?'correctGuesser':'wrongGuesser',r.variant)} tone={correct?'text-crimson':'text-plum'} reveal={correct?'strong':'soft'}/>
  <p className="mt-3 text-sm font-medium text-obsidian/80">{g.card.question}</p>
  <ul className="mt-2 space-y-2">{predictions.map(x=><li key={x.guesserId} data-prediction={x.correct?'right':'missed'} className={`rounded-[12px] border-2 px-3 py-2 text-sm ${x.correct?'border-crimson':'border-obsidian/15'}`}>
   <div className="flex items-start justify-between gap-2"><span className="font-bold">{t('predictionRow',{guesserSelf:self(names.isMe(x.guesserId)),guesser:names.of(x.guesserId),holderSelf:self(names.isMe(x.holderId)),holder:names.of(x.holderId)})}</span>
    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${x.correct?'text-crimson':'text-obsidian/60'}`}>{x.correct?t('readRight'):t('missed')}</span></div>
   <p className="mt-1 text-[13px] leading-5 text-obsidian/75">{letter(x.guessChoice)} · {g.card.choices[x.guessChoice]}{x.correct?'':` → ${letter(x.secretChoice)} · ${g.card.choices[x.secretChoice]}`}</p>
   {x.correct&&<p className="mt-1 text-xs font-bold">{t('sparksFor',{self:self(names.isMe(x.guesserId)),count:x.sparksEarned,name:names.of(x.guesserId)})}</p>}
  </li>)}</ul>
  {g.forfeit&&<Forfeit key={g.forfeit.payerId} g={g} meId={meId} names={names} send={send} pending={pending}/>}
 </div>;
}

/** Picky Kitty: the owner chooses among three questions; the partner waits without seeing them. */
function PickyKitty({g,meId,names,selected,setSelected}:CardProps){
 const t=useTranslations('card.picky'),tm=useTranslations('card.mr');const pk=g.pickyKitty!,owner=pk.ownerId===meId;
 return <div>
  <div className="pop-in fx-ember-sweep mb-3 rounded-[12px] bg-obsidian p-3 text-ivory"><p className="relative z-[2] flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-pink"><TypeEmblem type="POWER_CARD" size="tray" className="-my-1.5 -ml-1"/>{t('title')}</p>
   <p className="relative z-[2] mt-1 text-sm leading-5">{owner?t('body'):t('waiting',{name:names.of(pk.ownerId)})}</p></div>
  {owner&&pk.candidates?<div className="space-y-2" role="radiogroup" aria-label={t('title')}>{pk.candidates.map((c,i)=><ChoiceButton key={c.id} keyLabel={String(i+1)} selected={selected===i} onClick={()=>setSelected(i)} tag={selected===i?tm('selected'):undefined}>{c.question}</ChoiceButton>)}</div>
   :<div className="mt-1 select-none opacity-50" aria-hidden><Title>{g.card.question}</Title></div>}
 </div>;
}

/** One More Question: one Yes/No question each, asked after the answer is locked and before the guess. */
function QuestionTime({g,meId,names,questionText,setQuestionText,send,pending}:CardProps){
 const t=useTranslations('card.question'),heat=useHeat();
 const partnerId=[g.secretPlayerId,g.guessingPlayerId].find(id=>id!==meId)!;
 const mine=g.questions?.[meId],theirs=g.questions?.[partnerId];
 const status=(asker:string,q?:QuestionView)=>{if(!q)return null;const me=self(names.isMe(asker)),name=names.partner;
  if(q.status==='OPEN')return t('open',{self:me,name});if(q.status==='PASSED')return t('passed',{self:me,name});
  return <>{t('asked',{self:me,name,text:q.text||''})}<br/><span className="font-bold">{q.status==='ASKED'?t('waiting'):q.status==='ANSWERED'?t('answered',{answer:q.answer||'NO'}):t('declined',{self:me,name})}</span></>};
 return <section className="mt-4 rounded-[14px] border-2 border-obsidian/15 p-3" aria-label={t('title')}>
  <Label>{t('title')}</Label>
  {mine?.status==='OPEN'?<><label className="mt-2 block"><span className="sr-only">{t('label')}</span><input value={questionText} maxLength={140} onChange={e=>setQuestionText(e.target.value)} placeholder={t('placeholder',{name:names.partner})} className="focus-ring w-full rounded-[10px] border-2 border-obsidian/20 bg-transparent px-3 py-2 text-[15px]"/></label>
   <p className="mt-1.5 text-xs leading-5 text-obsidian/70">{t('heat',{heat:heat.label(g.heat),name:names.partner})}</p></>
   :<p className="mt-2 text-sm leading-5">{status(meId,mine)}</p>}
  {theirs?.status==='ASKED'?<div className="mt-3 rounded-[12px] bg-obsidian/5 p-3"><p className="text-xs font-bold uppercase tracking-wider text-plum">{t('incoming',{name:names.partner})}</p><p className="mt-1 text-[15px] font-medium leading-6">“{theirs.text}”</p>
    <div className="mt-2 flex gap-2">{(['YES','NO'] as const).map(a=><Button key={a} variant="primary" size="md" className="flex-1" disabled={pending} onClick={()=>send('ANSWER_QUESTION',{answer:a})}>{a==='YES'?t('yes'):t('no')}</Button>)}
     <Button variant="ghost" size="md" disabled={pending} onClick={()=>send('ANSWER_QUESTION',{answer:'DECLINE'})}>{t('pass')}</Button></div></div>
   :<p className="mt-2 text-sm leading-5 text-obsidian/80">{status(partnerId,theirs)}</p>}
 </section>;
}

/** After a reveal: optional Power Card moments. Neither changes the result. */
function AfterReveal(p:CardProps){return <>{p.g.followUp&&<FollowUp {...p}/>}{p.g.bonusMoment&&<BonusMoment {...p}/>}</>}

function FollowUp({g,meId,names,replyText,setReplyText,send,pending}:CardProps){
 const t=useTranslations('card.followUp');const f=g.followUp!,responder=f.responderId===meId,name=names.partner;
 const choice=`${letter(f.choice)} · ${g.card.choices[f.choice]}`;
 return <section className="fx-card-lift mt-3 rounded-[14px] border-2 border-obsidian p-3" aria-label={t('title')}>
  <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Label>{t('title')}</Label></div><TypeEmblem type="POWER_CARD" size="tray" className="-mr-1 -mt-1"/></div>
  {f.stage==='ASKED'?(responder?<>
    <p className="mt-1 text-sm leading-5">{t('askedResponder',{name,role:f.role,choice})}</p>
    <input value={replyText} maxLength={280} onChange={e=>setReplyText(e.target.value)} placeholder={t('placeholder')} aria-label={t('placeholder')} className="focus-ring mt-2 w-full rounded-[10px] border-2 border-obsidian/20 bg-transparent px-3 py-2 text-[15px]"/>
    <AnswerPair no={t('pass')} yes={t('tell')} pending={pending} onNo={()=>send('FOLLOW_UP_REPLY',{accept:false})} onYes={()=>send('FOLLOW_UP_REPLY',{accept:true,text:replyText.trim()||undefined})}/>
   </>:<p className="mt-1 text-sm leading-5">{t('askedAsker',{name,role:f.role,choice})}</p>)
   :<p className="mt-1 text-sm leading-5">{f.stage==='DECLINED'?t('declined',{self:self(responder),name}):f.reply?t('answered',{self:self(responder),name,reply:f.reply}):t('answeredAloud',{self:self(responder),name})}</p>}
  <p className="mt-1.5 text-xs text-obsidian/65">{t('note')}</p>
 </section>;
}

function BonusMoment({g,meId,names,send,pending}:CardProps){
 const t=useTranslations('card.bonus');const b=g.bonusMoment!,name=names.partner;
 return <section className="fx-card-lift relative mt-3 overflow-hidden rounded-[14px] border-2 border-dashed border-crimson p-3" aria-label={t('title')}>{b.stage==='OFFERED'&&<EventFlash tone="ember"/>}
  <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Label>{t('title')}</Label><p className="mt-1 text-sm leading-5">{t('offered',{self:self(b.giverId===meId),name})}</p></div><TypeEmblem type="POWER_CARD" size="tray" className="-mr-1 -mt-1"/></div>
  <p className="mt-2 text-[15px] font-bold leading-snug">{b.question}</p>
  {b.challenge&&<p className="mt-1 text-[13px] leading-5 text-obsidian/80">{b.challenge}</p>}
  {b.stage==='OFFERED'&&(b.iAnswered?<p className="mt-2 text-xs font-bold">{t('waiting',{name})}</p>
   :<><p className="mt-2 text-xs leading-5 text-obsidian/75">{t('consent')}</p><AnswerPair no={t('decline')} yes={t('accept')} pending={pending} onNo={()=>send('BONUS_VOTE',{accept:false})} onYes={()=>send('BONUS_VOTE',{accept:true})}/></>)}
  {b.stage==='ACCEPTED'&&(b.iFinished?<p className="mt-2 text-xs font-bold">{t('waitingDone',{name})}</p>:<><p className="mt-2 text-xs leading-5">{b.partnerFinished?t('partnerDone',{name}):t('accepted')}</p><AnswerPair no={t('stop')} yes={t('done')} pending={pending} onNo={()=>send('BONUS_DONE',{completed:false})} onYes={()=>send('BONUS_DONE',{completed:true})}/></>)}
  {(b.stage==='COMPLETED'||b.stage==='DECLINED'||b.stage==='STOPPED')&&<p className="mt-2 text-xs font-bold">{t(b.stage)}</p>}
 </section>;
}

/** The forfeit for a miss: the player who missed draws it face down (the partner watches), then you both decide. */
function Forfeit({g,meId,names,send,pending}:{g:GameStateView;meId:string;names:Names;send:CardProps['send'];pending:boolean}){
 const t=useTranslations('card.forfeit'),td=useTranslations('draw.forfeit'),tt=useTranslations('cardType');const f=g.forfeit!,payer=f.payerId===meId,name=names.partner;
 // Seen on this phone while it was drawn: keep the deck so the drawn card turns over in place.
 const [watched,setWatched]=useState(f.stage==='DRAWING');
 useEffect(()=>{if(f.stage==='DRAWING')setWatched(true)},[f.stage]);
 const status=f.stage==='DRAWING'?(payer?td('payer'):t('offeredCollector',{name})):f.stage==='ACCEPTED'?(payer?t('acceptedPayer'):t('acceptedCollector',{name})):f.stage==='PASSED'?t('passed'):f.stage==='WAITING'?t('waiting',{name}):payer?t('offeredPayer'):t('offeredCollector',{name});
 const offered=f.stage==='OFFERED'||f.stage==='WAITING';
 const deck=watched&&f.stage!=='PASSED';
 // The forfeit lands below the answers: bring it into view once, gently (instantly under reduced motion).
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=panel.current;if(!el)return;const calm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const id=setTimeout(()=>el.scrollIntoView({block:'nearest',behavior:calm?'auto':'smooth'}),calm?0:350);return()=>clearTimeout(id)},[]);
 return <div ref={panel} className="forfeit-arena fx-card-lift relative mt-4 overflow-hidden" style={{['--fx-delay' as string]:'.35s'}}>{f.stage==='OFFERED'&&<EventFlash tone="ember"/>}
  <div className="forfeit-header"><span className="forfeit-rule"/><div className="min-w-0 text-center">{offered&&<p className="display fx-headline mb-1 text-[clamp(1.3rem,7cqi,1.8rem)] text-crimson">{t('headline')}</p>}<p className="text-[10px] font-bold uppercase tracking-[.24em] text-pink">{t('label')}</p></div><span className="forfeit-rule"/></div>
  {deck?<div className="forfeit-deck"><DrawDeck art="forfeit" cards={f.cards??1} canDraw={payer&&f.stage==='DRAWING'} pending={pending} watching={td('watching',{name:names.of(f.payerId)})}
    onDraw={i=>send('DRAW_CARD',{draw:'FORFEIT',choice:i})}
    result={f.text?<><p className="text-[10px] font-bold uppercase tracking-[.2em] text-crimson">{tt('FORFEIT')}</p><p className="text-[15px] font-bold leading-snug">{f.text}</p></>:undefined}/></div>
   :f.text&&<p className="mt-1 text-[15px] font-bold leading-snug">{f.text}</p>}
  <p className="forfeit-status">{status}</p></div>;
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
 const effect=g.card.effect||'ROLE_REVERSAL',done=g.phase==='ROUND_COMPLETE';
 const next=g.nextMindReaderSecretId,nextName=names.of(next),otherIsMe=!names.isMe(next),otherName=otherIsMe?names.me:names.partner;
 if(done&&g.result?.skipped)return <div><Headline text={pick('skipped',g.result.variant)} tone="text-plum" reveal="soft"/><Note>{t('skippedNote')}</Note></div>;
 return <div>
  {done&&<EventFlash tone="ember"/>}
  <Eyebrow>{done?t('activated'):t('turn')}</Eyebrow>
  {/* Branded headline from the card, then the functional effect name and its exact rules. */}
  <p className="display fx-headline mt-1.5 text-[clamp(2rem,12cqi,3.2rem)]">{g.card.question}</p>
  <p className="mt-1 text-[15px] font-bold uppercase tracking-[.14em] text-crimson">{tw(`${effect}.title`)}</p>
  <div key={done?'on':'off'} className={`mt-3 rounded-[12px] bg-obsidian p-3 text-sm leading-6 text-ivory ${done?'fx-reward-glow':'fx-card-lift'}`} style={done?undefined:{['--fx-delay' as string]:'.3s'}}>
   {effect==='ROLE_REVERSAL'?t.rich('roleReversal',{b:bold,next:nextName,other:otherName,nextSelf:self(names.isMe(next)),otherSelf:self(otherIsMe)}):tw(`${effect}.effect`)}
  </div>
  <Note>{done?(g.result?.twistAlreadyPending?t('alreadyPending'):tw(`${effect}.applied`)):t('pendingNote')}</Note>
 </div>;
}
