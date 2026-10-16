'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import type {Ack,DesireChoice,GameAction,GameStateView,RoomView} from '@after-dark/contracts';
import {playCue} from '@/lib/sound';
import {ActionBar,WaitStatus,type ActionSpec} from '../ui/action-bar';
import {Button} from '../ui/button';
import {PlayCard,type Names} from './cards';
import {DeckIcon,DrawDeck} from './draw-deck';
import {Hud} from './hud';
import {Onboarding,RulesList} from './onboarding';
import {EventFlash} from '../ui/event-fx';
import {PowerCardFace,PowerTray} from './powers';
import {Results} from './results';
import {newActionId,Sheet} from './sheet';

/** Which control started the request in flight; it shows the loading state and the others wait. */
type Slot='primary'|'secondary'|'verdict-yes'|'verdict-no'|'power'|'mission'|'ack'|'inline'|'draw';
type Send=(type:GameAction['type'],extra?:Partial<GameAction>,slot?:Slot)=>Promise<Ack<RoomView>>;
type Bar={primary?:ActionSpec;secondary?:ActionSpec;note?:string;waiting?:string};
type T=ReturnType<typeof useTranslations<'actions'>>;
const seenKey=(gameId:string,key:string)=>`after-dark:seen:${gameId}:${key}`;
const wasSeen=(k:string)=>{try{return localStorage.getItem(k)==='1'}catch{return false}};
const markSeen=(k:string)=>{try{localStorage.setItem(k,'1')}catch{}};

export function PlayScreen({room,meId,connected,act,lobby}:{room:RoomView;meId:string;connected:boolean;act:(a:GameAction)=>Promise<Ack<RoomView>>;lobby:()=>void}){
 const g=room.game!;const me=room.players.find(p=>p.id===meId)!,partner=room.players.find(p=>p.id!==meId);
 const tc=useTranslations('common'),ta=useTranslations('actions'),tv=useTranslations('verdict'),tr=useTranslations('reward'),to=useTranslations('onboarding');
 const names=useMemo<Names>(()=>{const other=partner?.nickname||tc('yourPartner');return {me:tc('you'),partner:other,isMe:id=>id===meId,of:id=>id===meId?tc('you'):other}},[meId,partner?.nickname,tc]);
 const [selected,setSelected]=useState<number|null>(null),[desire,setDesire]=useState<DesireChoice|null>(null),[pending,setPending]=useState<Slot|null>(null);
 const [prediction,setPrediction]=useState<number|null>(null),[questionText,setQuestionText]=useState(''),[replyText,setReplyText]=useState('');
 const [sheet,setSheet]=useState<null|'powers'|'rules'|'verdict'|'reward'|'draw-mission'|'draw-power'>(null);
 const send:Send=async(type,extra={},slot='primary')=>{setPending(slot);playCue('press');try{return await act({actionId:newActionId(),expectedVersion:g.version,round:g.round,type,...extra})}finally{setPending(null)}};
 // Local picks reset whenever the authoritative round, phase, part or question moves on (never on a language switch).
 useEffect(()=>{setSelected(null);setDesire(null);setPrediction(null)},[g.round,g.phase,g.challengePart,g.card.id,!!g.pickyKitty]);
 useEffect(()=>{setQuestionText('');setReplyText('')},[g.round,g.challengePart]);
 useEffect(()=>{if(g.phase==='REVEAL'||g.phase==='MUTUAL_DESIRE_REVEAL')playCue('reveal')},[g.phase]);
 // Optional moments never interrupt the card in play: a partner's mission claim and open draws wait on the HUD until opened.
 const verdict=g.opponentMissionDeclared;
 useEffect(()=>{if(!verdict)setSheet(s=>s==='verdict'?null:s)},[verdict]);
 // Reward reveal shows once per earned card (or once per full-inventory miss), surviving reloads.
 const rewardKey=g.lastReward?seenKey(g.id,g.lastReward.powerId||`full-${g.lastReward.round}`):null;
 // A drawn Power Card is revealed by the draw itself; only a full-hand miss still gets the reward sheet.
 useEffect(()=>{if(rewardKey&&!wasSeen(rewardKey)){if(sheet==='draw-power'||g.lastReward?.powerId){markSeen(rewardKey);return}setSheet(s=>s??'reward');playCue('reward')}},[rewardKey]);
 // The next card is drawn in turns; while its drawer is offline the partner draws instead (the server allows the same).
 const draw={mine:g.nextStep==='DRAW'&&(g.nextDrawerId===meId||!!partner&&!partner.connected),forPartner:g.nextStep==='DRAW'&&g.nextDrawerId!==meId};

 // A session dealt under older rules is closed rather than reinterpreted; the host takes you both back to start fresh.
 if(g.outdated)return <Outdated host={me.isHost} lobby={lobby}/>;
 if(g.phase==='GAME_COMPLETE')return <Results room={room} meId={meId} lobby={lobby}/>;
 if(g.phase==='HOW_TO_PLAY')return <Onboarding g={g} names={names} canDraw={draw.mine} sending={pending==='ack'} onDraw={()=>send('NEXT_ROUND',{},'ack')}/>;
 const bar=actionsFor(g,meId,names,{selected,desire,prediction,questionText},send,ta,draw);
 const barPending=pending==='primary'||pending==='secondary'?pending:pending?'primary':null;
 const verdictAnswer=async(completed:boolean)=>{const r=await send('CONFIRM_MISSION',{missionOwnerId:verdict!.ownerId,completed},completed?'verdict-yes':'verdict-no');if(r.ok)setSheet(null)};
 return <main className="gameplay-shell">
  <Hud g={g} me={me} partner={partner} connected={connected} onPowers={()=>setSheet('powers')} onRules={()=>setSheet('rules')} claiming={pending==='mission'} onClaimMission={()=>send('DECLARE_MISSION',{},'mission')} onDrawMission={()=>setSheet(g.draws?.POWER?'draw-power':'draw-mission')} onVerdict={()=>setSheet('verdict')} verdictPending={!!verdict&&sheet!=='verdict'}/>
  <div className="px-3 pb-3 pt-3"><PlayCard g={g} meId={meId} names={names} selected={selected} setSelected={setSelected} desire={desire} setDesire={setDesire}
   prediction={prediction} setPrediction={setPrediction} questionText={questionText} setQuestionText={setQuestionText} replyText={replyText} setReplyText={setReplyText}
   send={(type,extra)=>{send(type,extra,'inline')}} pending={!!pending}/></div>
  <ActionBar className="game-action-bar" primary={bar.primary} secondary={bar.secondary} note={bar.note} waiting={bar.waiting} pending={barPending}/>

  {sheet==='powers'&&<PowerTray g={g} using={pending==='power'} onClose={()=>setSheet(null)} onUse={async id=>{const r=await send('USE_POWER',{powerId:id},'power');if(r.ok)setSheet(null)}}/>}
  {(sheet==='draw-mission'||sheet==='draw-power')&&<DrawSheet key={sheet} kind={sheet==='draw-power'?'POWER':'MISSION'} g={g} names={names} pending={pending==='draw'}
   onDraw={i=>send('DRAW_CARD',{draw:sheet==='draw-power'?'POWER':'MISSION',choice:i},'draw')}
   onClose={()=>setSheet(null)} onViewPowers={()=>setSheet('powers')}/>}
  {sheet==='rules'&&<Sheet eyebrow={to('sheetEyebrow')} title={to('sheetTitle')} onClose={()=>setSheet(null)}><RulesList heat={g.heat} tone="ivory"/></Sheet>}
  {sheet==='verdict'&&verdict&&<Sheet eyebrow={tv('eyebrow',{name:names.partner})} title={tv('title')} onClose={()=>setSheet(null)}>
   <blockquote className="rounded-[14px] bg-obsidian p-4 text-[17px] font-medium leading-7 text-ivory">“{verdict.text}”</blockquote>
   <p className="mt-3 text-sm leading-6">{tv('body',{name:names.partner})}</p>
   <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row">
    <Button variant="secondary" surface="light" size="md" disabled={!!pending&&pending!=='verdict-no'} loading={pending==='verdict-no'} loadingLabel={tv('sending')} onClick={()=>verdictAnswer(false)}>{tv('notYet')}</Button>
    <Button variant="primary" size="lg" className="flex-1" disabled={!!pending&&pending!=='verdict-yes'} loading={pending==='verdict-yes'} loadingLabel={tv('confirming')} onClick={()=>verdictAnswer(true)}>{tv('yes')}</Button>
   </div>
   <Button variant="ghost" surface="light" block className="mt-2" onClick={()=>setSheet(null)}>{tv('later')}</Button>
  </Sheet>}
  {sheet==='reward'&&g.lastReward&&<Sheet reveal eyebrow={tr('eyebrow')} title={g.lastReward.inventoryFull?tr('titleFull'):tr('title')} onClose={()=>{markSeen(rewardKey!);setSheet(null)}}>
   <EventFlash tone={g.lastReward.inventoryFull?'plum':'ember'}/>
   {g.lastReward.inventoryFull?<p className="text-sm leading-6">{tr('full',{limit:g.inventoryLimit})}</p>
    :(()=>{const card=g.inventory.find(p=>p.id===g.lastReward!.powerId);return card?<div className="fx-card-lift" style={{['--fx-delay' as string]:'.15s'}}><div className="fx-reward-glow fx-ember-sweep rounded-[16px] border-2 border-obsidian p-4" style={{['--fx-delay' as string]:'.4s'}}><div className="relative z-[2]"><PowerCardFace kind={card.kind} emblem="event"/></div></div></div>:<p className="text-sm">{tr('played')}</p>})()}
   <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row"><Button variant="ghost" surface="light" onClick={()=>{markSeen(rewardKey!);setSheet(null)}}>{tr('keepPlaying')}</Button><Button variant="secondary" surface="light" size="md" className="flex-1" onClick={()=>{markSeen(rewardKey!);setSheet('powers')}}>{tr('viewPowers')}</Button></div>
  </Sheet>}
 </main>;
}

/**
 * Drawing a Secret Mission or a Power Card: the player's own deck is shuffled and spread face down; the tapped card turns
 * over once the server has dealt it. Closing before drawing keeps the draw open on the HUD.
 */
function DrawSheet({kind,g,names,pending,onDraw,onClose,onViewPowers}:{kind:'MISSION'|'POWER';g:GameStateView;names:Names;pending:boolean;onDraw:(i:number)=>void;onClose:(landed:boolean)=>void;onViewPowers:()=>void}){
 const t=useTranslations(kind==='MISSION'?'draw.mission':'draw.power'),tp=useTranslations('powers'),tr=useTranslations('reward'),tt=useTranslations('cardType');
 // What the player held before tapping; the draw has landed once the server's view moves past it.
 const before=useRef(kind==='MISSION'?g.mission?.id:JSON.stringify(g.lastReward??null));const [drew,setDrew]=useState(false);
 const landed=drew&&(kind==='MISSION'?!!g.mission&&g.mission.id!==before.current:JSON.stringify(g.lastReward??null)!==before.current);
 const cards=g.draws?.[kind]??0,reward=g.lastReward;
 const result=!landed?undefined:kind==='MISSION'?<><p className="text-[10px] font-bold uppercase tracking-[.2em] text-crimson">{t('revealed')}</p><p className="text-[15px] font-medium leading-6">{g.mission!.text}</p></>
  :reward?.inventoryFull||!reward?.kind?<p className="text-sm leading-6">{tr('full',{limit:g.inventoryLimit})}</p>
  :<><p className="text-[10px] font-bold uppercase tracking-[.2em] text-pink">{tt('POWER_CARD')} · {tp(`kinds.${reward.kind}.alias`)}</p><p className="display text-2xl">{tp(`kinds.${reward.kind}.title`)}</p><p className="text-[13px] leading-5 text-ivory/85">{tp(`kinds.${reward.kind}.description`)}</p></>;
 return <Sheet reveal={kind==='POWER'} eyebrow={t('eyebrow')} title={t('title')} onClose={()=>onClose(landed)}>
  {!landed&&<p className="mb-3 text-sm leading-6">{t('body',{name:names.partner})}</p>}
  {(cards>0||drew)&&<DrawDeck art={kind==='MISSION'?'secret-mission':'power-card'} dark={kind==='POWER'&&!!reward?.kind} cards={cards} canDraw={cards>0&&!landed} pending={pending} result={result} onDraw={i=>{setDrew(true);onDraw(i)}}/>}
  {landed&&<div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row">
   {kind==='POWER'&&<Button variant="ghost" surface="light" onClick={onViewPowers}>{t('view')}</Button>}
   <Button variant="primary" size="md" className="flex-1" onClick={()=>onClose(true)}>{t('keep')}</Button></div>}
  {!landed&&<Button variant="ghost" surface="light" block className="mt-3" onClick={()=>onClose(false)}>{tp('saveForLater')}</Button>}
 </Sheet>;
}

function Outdated({host,lobby}:{host:boolean;lobby:()=>void}){
 const t=useTranslations('outdated');const [leaving,setLeaving]=useState(false);
 return <main className="grid min-h-[100dvh] place-items-center px-5 text-center"><div className="max-w-sm">
  <h1 className="display text-4xl">{t('title')}</h1><p className="mt-3 text-ivory/80">{t('body')}</p>
  <div className="mt-6">{host?<Button variant="primary" size="lg" block loading={leaving} loadingLabel={t('leaving')} onClick={()=>{setLeaving(true);lobby()}}>{t('hostAction')}</Button>:<WaitStatus>{t('waiting')}</WaitStatus>}</div>
 </div></main>;
}

/**
 * Maps the authoritative phase to this player's actions. Agreeing, starting, confirming, skipping, stopping and waiting
 * each get their own wording, in every language.
 */
type Picks={selected:number|null;desire:DesireChoice|null;prediction:number|null;questionText:string};
function actionsFor(g:GameStateView,meId:string,names:Names,{selected,desire,prediction,questionText}:Picks,send:Send,t:T,draw:{mine:boolean;forPartner:boolean}):Bar{
 const name=names.partner;
 /**
  * The way on from a settled card, as the server names it: the next card is a draw (its drawer taps the deck, the partner
  * watches); part B, the next forfeit and the results are steps either of you can take.
  */
 const advance=(done=false):Bar=>{
  const go=(label:string,loadingLabel:string,extra:Partial<ActionSpec>={}):Bar=>({primary:{label,loadingLabel,run:()=>send('NEXT_ROUND'),...extra}});
  if(g.nextStep==='RESULTS')return go(done?t('doneResults'):t('results'),t('resultsLoading'));
  if(g.nextStep==='PART_B')return go(t('partB'),t('partBLoading'));
  if(g.nextStep==='FORFEIT')return go(t('nextForfeit'),t('nextForfeitLoading'));
  if(g.nextStep==='DRAW')return draw.mine?{...go(done?t('drawDone'):t('drawNext'),t('drawing'),{icon:<DeckIcon/>,attention:true}),note:draw.forPartner?t('drawForPartner',{name}):undefined}:{waiting:t('waitDraw',{name})};
  return {};
 };
 const skip:ActionSpec={label:t('skip'),loadingLabel:t('skipping'),run:()=>send('SKIP',{},'secondary')};
 if(g.card.type==='MIND_READER'){
  const isSecret=g.secretPlayerId===meId,partnerId=isSecret?g.guessingPlayerId:g.secretPlayerId;
  // Picky Kitty: the owner picks one of three questions (or puts the card back); the partner waits.
  if(g.pickyKitty){
   if(g.pickyKitty.ownerId!==meId)return {secondary:skip,waiting:t('waitPick',{name})};
   const pick=selected===null?undefined:g.pickyKitty.candidates?.[selected],armed=g.inventory.find(p=>p.status==='ARMED');
   return {primary:{label:t('pickThis'),loadingLabel:t('picking'),run:()=>send('PICK_QUESTION',{cardId:pick?.id}),disabled:!pick},
    secondary:armed?{label:t('cancelPick'),loadingLabel:t('cancellingPick'),run:()=>send('CANCEL_POWER',{powerId:armed.id},'secondary')}:undefined,note:t('notePick')};
  }
  if(g.phase==='COUNTER_MIND_SUBMIT')return g.counterMind?.iSubmitted
   ?{secondary:skip,waiting:t('waitCounter',{name})}
   :{primary:{label:t('sealBoth'),loadingLabel:t('sealingBoth'),run:()=>send('SUBMIT_COUNTER_MIND',{choice:selected!,prediction:prediction!}),disabled:selected===null||prediction===null},secondary:skip,note:t('noteCounter',{name})};
  if(g.phase==='QUESTION_TIME'){
   const mine=g.questions?.[meId],theirs=g.questions?.[partnerId];
   if(mine?.status==='OPEN')return {primary:{label:t('ask'),loadingLabel:t('asking'),run:()=>send('ASK_QUESTION',{text:questionText.trim()}),disabled:!questionText.trim()},secondary:{label:t('noQuestion'),loadingLabel:t('noQuestionLoading'),run:()=>send('PASS_QUESTION',{},'secondary')}};
   return theirs?.status==='ASKED'?{secondary:skip,note:t('noteAnswerBelow',{name})}:{secondary:skip,waiting:t('waitQuestions',{name})};
  }
  if(g.phase==='WAITING_FOR_SECRET')return isSecret
   ?{primary:{label:t('lockIt'),loadingLabel:t('lockingIt'),run:()=>send('SUBMIT_SECRET',{choice:selected!}),disabled:selected===null},secondary:skip,note:selected===null?t('noteChoose'):t('noteHidden',{name})}
   :{secondary:skip,waiting:t('waitHiding',{name}),note:g.inventory.some(x=>x.usable)?t('notePower'):undefined};
  if(g.phase==='WAITING_FOR_GUESS')return !isSecret
   ?{primary:{label:t('lockGuess',{count:g.sparkValue}),loadingLabel:t('lockingGuess'),run:()=>send('SUBMIT_GUESS',{choice:selected!}),disabled:selected===null},secondary:skip,note:selected===null?t('noteGuess',{name}):undefined}
   :{secondary:skip,waiting:t('waitReading',{name})};
  const f=g.forfeit;
  if(g.phase==='REVEAL'&&f){
   const payer=f.payerId===meId;
   // The player who missed draws by tapping a face-down card on the card itself; either of you can pass meanwhile.
   if(f.stage==='DRAWING')return payer?{secondary:{label:t('pass'),loadingLabel:t('passing'),run:()=>send('FORFEIT_VOTE',{accept:false},'secondary')},note:t('noteDrawForfeit')}
    :{secondary:{label:t('letItSlide'),loadingLabel:t('passing'),run:()=>send('FORFEIT_VOTE',{accept:false},'secondary')},waiting:t('waitDrawForfeit',{name})};
   if(f.stage==='OFFERED')return {primary:{label:payer?t('payUp'):t('collect'),loadingLabel:t('sendingAnswer'),attention:true,run:()=>send('FORFEIT_VOTE',{accept:true})},secondary:{label:payer?t('pass'):t('letItSlide'),loadingLabel:t('passing'),run:()=>send('FORFEIT_VOTE',{accept:false},'secondary')}};
   if(f.stage==='WAITING')return {waiting:t('waitForfeit',{name})};
   if(f.stage==='ACCEPTED'){const a=advance(true);return {...a,note:a.note??(payer?t('notePayer'):t('noteCollector',{name}))}}
  }
  // Double Challenge part A leads into part B on the same card; otherwise the reveal leads to the next draw.
  if(g.phase==='REVEAL')return advance();
 }
 if(g.card.type==='CHEMISTRY'){
  const stage=g.chemistry?.stage;const stop:ActionSpec={label:t('stop'),loadingLabel:t('stopping'),run:()=>send('CHEMISTRY_STOP',{},'secondary')};
  if(stage==='INVITATION')return {primary:{label:t('into'),loadingLabel:t('sendingAnswer'),run:()=>send('CHEMISTRY_VOTE',{accept:true})},secondary:{label:t('notTonight'),loadingLabel:t('passing'),run:()=>send('CHEMISTRY_VOTE',{accept:false},'secondary')}};
  if(stage==='WAITING_FOR_CONSENT')return {secondary:{label:t('changedMind'),loadingLabel:t('withdrawing'),run:()=>send('CHEMISTRY_VOTE',{accept:false},'secondary')},waiting:t('waitConsent',{name})};
  // Agreeing to take part is the start; these two stages only remain for a game already waiting at the older start step.
  if(stage==='MUTUALLY_ACCEPTED')return {primary:{label:t('start'),loadingLabel:t('starting'),run:()=>send('CHEMISTRY_START')},secondary:stop};
  if(stage==='WAITING_TO_START')return {secondary:stop,waiting:t('waitStart',{name})};
  if(stage==='IN_PROGRESS')return {primary:{label:t('didIt'),loadingLabel:t('confirming'),run:()=>send('CHEMISTRY_DONE')},secondary:stop,note:t('noteDidIt')};
  if(stage==='WAITING_FOR_COMPLETION')return {secondary:stop,waiting:t('waitCompletion',{name})};
 }
 if(g.card.type==='MUTUAL_DESIRE'&&g.phase==='MUTUAL_DESIRE_CHOICE'){
  if(g.hasSubmittedChoice)return {secondary:skip,waiting:t('waitSealed',{name})};
  return {primary:{label:t('seal'),loadingLabel:t('sealing'),run:()=>send('MUTUAL_DESIRE_CHOICE',{desire:desire!}),disabled:!desire},secondary:skip,note:desire?t('noteSealChosen'):t('noteSeal')};
 }
 if(g.card.type==='PLOT_TWIST'&&g.phase==='PLOT_TWIST'){
  const skipTwist:ActionSpec={label:t('skipTwist'),loadingLabel:t('skipping'),run:()=>send('SKIP',{},'secondary')};
  if(g.hasSubmittedChoice)return {secondary:skipTwist,waiting:t('waitTwist',{name})};
  return {primary:{label:t('activate'),loadingLabel:t('activating'),run:()=>send('PLOT_TWIST_ACK')},secondary:skipTwist};
 }
 return advance();
}
