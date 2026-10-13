'use client';
import {useEffect,useMemo,useState} from 'react';
import {useTranslations} from 'next-intl';
import type {Ack,DesireChoice,GameAction,GameStateView,RoomView} from '@after-dark/contracts';
import {playCue} from '@/lib/sound';
import {ActionBar,type ActionSpec} from '../ui/action-bar';
import {Button} from '../ui/button';
import {PlayCard,type Names} from './cards';
import {Hud} from './hud';
import {Onboarding,RulesList} from './onboarding';
import {EventFlash} from '../ui/event-fx';
import {PowerCardFace,PowerTray} from './powers';
import {Results} from './results';
import {newActionId,Sheet} from './sheet';

/** Which control started the request in flight; it shows the loading state and the others wait. */
type Slot='primary'|'secondary'|'verdict-yes'|'verdict-no'|'power'|'mission'|'ack';
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
 const [sheet,setSheet]=useState<null|'powers'|'rules'|'verdict'|'reward'>(null);const [verdictDeferred,setVerdictDeferred]=useState<string|null>(null);
 const send:Send=async(type,extra={},slot='primary')=>{setPending(slot);playCue('press');try{return await act({actionId:newActionId(),expectedVersion:g.version,round:g.round,type,...extra})}finally{setPending(null)}};
 // Local picks reset whenever the authoritative round or phase moves on, or a Second Chance crosses the pick out (never on a language switch).
 useEffect(()=>{setSelected(null);setDesire(null)},[g.round,g.phase,g.eliminatedChoice]);
 useEffect(()=>{if(g.phase==='REVEAL'||g.phase==='MUTUAL_DESIRE_REVEAL')playCue('reveal')},[g.phase]);
 // A partner's mission claim interrupts once; it can be deferred to a HUD chip.
 const verdict=g.opponentMissionDeclared;const verdictKey=verdict?`${verdict.id}:${verdict.notYetCount}`:null;
 useEffect(()=>{if(verdictKey&&verdictDeferred!==verdictKey)setSheet(s=>s??'verdict');if(!verdictKey)setSheet(s=>s==='verdict'?null:s)},[verdictKey,verdictDeferred]);
 // Reward reveal shows once per earned card (or once per full-inventory miss), surviving reloads.
 const rewardKey=g.lastReward?seenKey(g.id,g.lastReward.powerId||`full-${g.lastReward.round}`):null;
 useEffect(()=>{if(rewardKey&&!wasSeen(rewardKey)){setSheet(s=>s??'reward');playCue('reward')}},[rewardKey]);

 if(g.phase==='GAME_COMPLETE')return <Results room={room} meId={meId} lobby={lobby}/>;
 if(g.phase==='HOW_TO_PLAY')return <Onboarding g={g} names={names} sending={pending==='ack'} onReady={()=>send('ACK_HOW_TO_PLAY',{},'ack')}/>;
 const bar=actionsFor(g,meId,names,selected,desire,send,ta);
 const barPending=pending==='primary'||pending==='secondary'?pending:pending?'primary':null;
 const verdictAnswer=async(completed:boolean)=>{const r=await send('CONFIRM_MISSION',{missionOwnerId:verdict!.ownerId,completed},completed?'verdict-yes':'verdict-no');if(r.ok)setSheet(null)};
 return <main className="gameplay-shell">
  <Hud g={g} me={me} partner={partner} connected={connected} onPowers={()=>setSheet('powers')} onRules={()=>setSheet('rules')} claiming={pending==='mission'} onClaimMission={()=>send('DECLARE_MISSION',{},'mission')} onVerdict={()=>setSheet('verdict')} verdictPending={!!verdict&&sheet!=='verdict'}/>
  <div className="px-3 pb-3 pt-3"><PlayCard g={g} meId={meId} names={names} selected={selected} setSelected={setSelected} desire={desire} setDesire={setDesire}/></div>
  <ActionBar className="game-action-bar" primary={bar.primary} secondary={bar.secondary} note={bar.note} waiting={bar.waiting} pending={barPending}/>

  {sheet==='powers'&&<PowerTray g={g} using={pending==='power'} onClose={()=>setSheet(null)} onUse={async id=>{const r=await send('USE_POWER',{powerId:id},'power');if(r.ok)setSheet(null)}}/>}
  {sheet==='rules'&&<Sheet eyebrow={to('sheetEyebrow')} title={to('sheetTitle')} onClose={()=>setSheet(null)}><RulesList heat={g.heat} tone="ivory"/></Sheet>}
  {sheet==='verdict'&&verdict&&<Sheet eyebrow={tv('eyebrow',{name:names.partner})} title={tv('title')} onClose={()=>{setVerdictDeferred(verdictKey);setSheet(null)}}>
   <blockquote className="rounded-[14px] bg-obsidian p-4 text-[17px] font-medium leading-7 text-ivory">“{verdict.text}”</blockquote>
   <p className="mt-3 text-sm leading-6">{tv('body',{name:names.partner})}</p>
   <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row">
    <Button variant="secondary" surface="light" size="md" disabled={!!pending&&pending!=='verdict-no'} loading={pending==='verdict-no'} loadingLabel={tv('sending')} onClick={()=>verdictAnswer(false)}>{tv('notYet')}</Button>
    <Button variant="primary" size="lg" className="flex-1" disabled={!!pending&&pending!=='verdict-yes'} loading={pending==='verdict-yes'} loadingLabel={tv('confirming')} onClick={()=>verdictAnswer(true)}>{tv('yes')}</Button>
   </div>
   <Button variant="ghost" surface="light" block className="mt-2" onClick={()=>{setVerdictDeferred(verdictKey);setSheet(null)}}>{tv('later')}</Button>
  </Sheet>}
  {sheet==='reward'&&g.lastReward&&<Sheet reveal eyebrow={tr('eyebrow')} title={g.lastReward.inventoryFull?tr('titleFull'):tr('title')} onClose={()=>{markSeen(rewardKey!);setSheet(null)}}>
   <EventFlash tone={g.lastReward.inventoryFull?'plum':'ember'}/>
   {g.lastReward.inventoryFull?<p className="text-sm leading-6">{tr('full',{limit:g.inventoryLimit})}</p>
    :(()=>{const card=g.inventory.find(p=>p.id===g.lastReward!.powerId);return card?<div className="fx-card-lift" style={{['--fx-delay' as string]:'.15s'}}><div className="fx-reward-glow fx-ember-sweep rounded-[16px] border-2 border-obsidian p-4" style={{['--fx-delay' as string]:'.4s'}}><div className="relative z-[2]"><PowerCardFace kind={card.kind}/></div></div></div>:<p className="text-sm">{tr('played')}</p>})()}
   <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row"><Button variant="ghost" surface="light" onClick={()=>{markSeen(rewardKey!);setSheet(null)}}>{tr('keepPlaying')}</Button><Button variant="secondary" surface="light" size="md" className="flex-1" onClick={()=>{markSeen(rewardKey!);setSheet('powers')}}>{tr('viewPowers')}</Button></div>
  </Sheet>}
 </main>;
}

/**
 * Maps the authoritative phase to this player's actions. Agreeing, starting, confirming, skipping, stopping and waiting
 * each get their own wording, in every language.
 */
function actionsFor(g:GameStateView,meId:string,names:Names,selected:number|null,desire:DesireChoice|null,send:Send,t:T):Bar{
 const last=g.round>=g.totalRounds;const name=names.partner;
 const next:ActionSpec={label:last?t('results'):t('next'),loadingLabel:last?t('resultsLoading'):t('nextLoading'),run:()=>send('NEXT_ROUND')};
 const skip:ActionSpec={label:t('skip'),loadingLabel:t('skipping'),run:()=>send('SKIP',{},'secondary')};
 if(g.card.type==='MIND_READER'){
  const isSecret=g.secretPlayerId===meId;
  if(g.phase==='WAITING_FOR_SECRET')return isSecret
   ?{primary:{label:t('lockIt'),loadingLabel:t('lockingIt'),run:()=>send('SUBMIT_SECRET',{choice:selected!}),disabled:selected===null},secondary:skip,note:selected===null?t('noteChoose'):t('noteHidden',{name})}
   :{secondary:skip,waiting:t('waitHiding',{name}),note:g.inventory.some(x=>x.usable)?t('notePower'):undefined};
  if(g.phase==='WAITING_FOR_GUESS')return !isSecret
   ?{primary:{label:t('lockGuess',{count:g.sparkValue}),loadingLabel:t('lockingGuess'),run:()=>send('SUBMIT_GUESS',{choice:selected!}),disabled:selected===null},secondary:skip,note:selected===null?(g.eliminatedChoice!==undefined?t('noteSecondChance'):t('noteGuess',{name})):undefined}
   :{secondary:skip,waiting:t('waitReading',{name})};
  const f=g.forfeit;
  if(g.phase==='REVEAL'&&f){
   const payer=f.payerId===meId;
   if(f.stage==='OFFERED')return {primary:{label:payer?t('payUp'):t('collect'),loadingLabel:t('sendingAnswer'),attention:true,run:()=>send('FORFEIT_VOTE',{accept:true})},secondary:{label:payer?t('pass'):t('letItSlide'),loadingLabel:t('passing'),run:()=>send('FORFEIT_VOTE',{accept:false},'secondary')}};
   if(f.stage==='WAITING')return {waiting:t('waitForfeit',{name})};
   if(f.stage==='ACCEPTED')return {primary:{...next,label:last?t('doneResults'):t('doneNext')},note:payer?t('notePayer'):t('noteCollector',{name})};
  }
  if(g.phase==='REVEAL')return {primary:next};
 }
 if(g.card.type==='CHEMISTRY'){
  const stage=g.chemistry?.stage;const stop:ActionSpec={label:t('stop'),loadingLabel:t('stopping'),run:()=>send('CHEMISTRY_STOP',{},'secondary')};
  if(stage==='INVITATION')return {primary:{label:t('into'),loadingLabel:t('sendingAnswer'),run:()=>send('CHEMISTRY_VOTE',{accept:true})},secondary:{label:t('notTonight'),loadingLabel:t('passing'),run:()=>send('CHEMISTRY_VOTE',{accept:false},'secondary')}};
  if(stage==='WAITING_FOR_CONSENT')return {secondary:{label:t('changedMind'),loadingLabel:t('withdrawing'),run:()=>send('CHEMISTRY_VOTE',{accept:false},'secondary')},waiting:t('waitConsent',{name})};
  // Both press start; the server starts one clock when the second press lands.
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
 return {primary:next};
}
