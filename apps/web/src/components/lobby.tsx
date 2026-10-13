'use client';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {Check,Copy,DoorOpen,Link2,Lock,Share2,Users} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {Ack,PlayerView,RoomView} from '@after-dark/contracts';
import {copyText} from '@/lib/clipboard';
import {useGames} from '@/lib/games';
import {playCue} from '@/lib/sound';
import {ConnectionStatus} from './connection-status';
import {Sheet} from './game/sheet';
import {ActionBar,type ActionSpec} from './ui/action-bar';
import {ChemistrySignal} from './ui/chemistry-signal';
import {Button} from './ui/button';
import {IconButton} from './ui/icon-button';
import {LanguageSwitcher} from './ui/language-switcher';
import {RisingHeatSelector} from './ui/rising-heat-selector';
import type {Emit,Notify} from './room-screen';

type CopyTarget='code'|'link';

export function Lobby({room,me,connected,emit,notify}:{room:RoomView;me:PlayerView;connected:boolean;emit:Emit;notify:Notify}){
 const t=useTranslations('lobby'),tc=useTranslations('common'),tconn=useTranslations('connection');const games=useGames();
 const router=useRouter();const partner=room.players.find(p=>p.id!==me.id);const [leaving,setLeaving]=useState(false);
 const [pending,setPending]=useState<'primary'|'secondary'|null>(null);
 const selected=games.find(g=>g.id===room.selectedGame)||games[0];const host=room.players.find(p=>p.isHost);const hostName=host?.nickname||tc('yourHost');
 const run=(slot:'primary'|'secondary',call:()=>Promise<Ack<RoomView>>)=>async()=>{setPending(slot);playCue('press');try{await call()}finally{setPending(null)}};
 const ready:ActionSpec={label:t('imIn'),loadingLabel:t('imInLoading'),run:run('primary',()=>emit('room:ready',{ready:true}))};
 const unready:ActionSpec={label:t('notYet'),loadingLabel:t('notYetLoading'),run:run('secondary',()=>emit('room:ready',{ready:false}))};
 const canStart=me.isHost&&!!partner?.ready&&selected.available;
 const start:ActionSpec={label:t('start'),loadingLabel:t('startLoading'),disabled:!canStart,icon:canStart?undefined:<Lock/>,run:run('primary',()=>emit('game:start',{gameSlug:room.selectedGame}))};
 // The host sets the heat, picks the game and deals; the partner only says when they are in. The backend enforces both roles.
 const bar=me.isHost
  ?{primary:start,note:!selected.available?t('noteComingSoon',{game:selected.title}):!partner?t('noteNoPartner'):!partner.ready?t('notePartnerWarming',{name:partner.nickname}):t('notePartnerReady',{name:partner.nickname})}
  :!me.ready
   ?{primary:ready,note:t('noteGuest',{host:hostName})}
   :{secondary:unready,waiting:t('waitGuest',{host:hostName})};

 return <main className="flex h-[100dvh] flex-col">
  <header className="flex flex-none items-center justify-between gap-2 px-3 pt-[max(.75rem,var(--safe-top))]">
   <Button variant="ghost" size="sm" icon={<DoorOpen/>} aria-label={tc('callItANight')} className="shrink-0" onClick={()=>setLeaving(true)}><span className="max-[379px]:sr-only">{tc('callItANight')}</span></Button>
   <div className="flex min-w-0 items-center gap-2"><ConnectionStatus connected={connected}/><LanguageSwitcher variant="compact"/></div>
  </header>
  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
   <div className="mx-auto max-w-2xl">
    <section className="mt-4 text-center">
     <p className="text-xs font-bold uppercase tracking-[.3em] text-pink">{partner?t('partnerJoined'):t('created')}</p>
     <p className="mt-2 text-xs uppercase tracking-[.2em] text-ivory/70">{t('roomCode')}</p>
     <p lang="en" className="display select-all text-[clamp(3.25rem,17vw,6rem)] tracking-[.1em]" data-testid="room-code">{room.code}</p>
     <InviteActions code={room.code} hasPartner={!!partner} notify={notify}/>
    </section>

    <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">{[me,partner].map((p,i)=><div key={p?.id||'waiting'} className="rounded-[15px] border-2 border-ivory/15 p-3">
     <div className="flex items-center gap-2.5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${p?'bg-crimson':'border-2 border-dashed border-ivory/30'}`}><Users size={18}/></span>
      <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-ivory/65">{i===0?t('you'):t('yourPartner')}</p><p className="display truncate text-2xl">{p?.nickname||t('lateTitle')}</p></div>
      {p&&<ChemistrySignal className="ml-auto" state={p.connected?'live':'idle'} label={p.connected?tconn('online'):tconn('offline')}/>}</div>
     {p?<p className={`mt-2 text-[11px] font-bold uppercase tracking-wider ${p.isHost||p.ready?'text-pink':'text-ivory/60'}`}>{p.isHost?t('hostRole'):p.ready?t('inTheMood'):t('warmingUp')}</p>:<p className="mt-2 text-[11px] text-ivory/60">{t('lateBody')}</p>}
     {p&&!p.connected&&i===1&&<p className="mt-1 text-[11px] text-pink">{tconn('partnerOffline')}</p>}
    </div>)}</div>

    <HeatPicker room={room} me={me} hostName={hostName} partner={partner} emit={emit}/>
    <GamePicker room={room} isHost={me.isHost} emit={emit} notify={notify}/>
   </div>
  </div>
  <ActionBar primary={bar.primary} secondary={bar.secondary} note={bar.note} waiting={'waiting' in bar?bar.waiting:undefined} pending={pending}/>
  {leaving&&<Sheet eyebrow={t('leaveEyebrow')} title={t('leaveTitle')} onClose={()=>setLeaving(false)}>
   <p className="text-sm leading-6">{partner?t('leaveBodyPartner',{name:partner.nickname}):t('leaveBodyAlone')}</p>
   <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row"><Button variant="ghost" surface="light" onClick={()=>setLeaving(false)}>{t('stay')}</Button><Button variant="danger" surface="light" size="md" icon={<DoorOpen/>} className="flex-1" onClick={()=>router.push('/games')}>{t('leave')}</Button></div>
  </Sheet>}
 </main>;
}

/** Invite link first (it pre-fills the code), the bare code second, native share when the platform offers it. */
function InviteActions({code,hasPartner,notify}:{code:string;hasPartner:boolean;notify:Notify}){
 const t=useTranslations('invite');
 const [copied,setCopied]=useState<CopyTarget|null>(null),[failed,setFailed]=useState<CopyTarget|null>(null),[canShare,setCanShare]=useState(false);
 const inviteUrl=typeof window==='undefined'?'':`${window.location.origin}/room/join?code=${code}`;
 useEffect(()=>{setCanShare(typeof navigator.share==='function'&&window.isSecureContext)},[]);
 async function copy(target:CopyTarget){
  const ok=await copyText(target==='code'?code:inviteUrl);
  if(ok){setCopied(target);setFailed(null);playCue('press');setTimeout(()=>setCopied(c=>c===target?null:c),2400)}else{setCopied(null);setFailed(target)}
 }
 async function share(){
  try{await navigator.share({title:'AFTER DARK',text:t('shareText',{code}),url:inviteUrl})}
  catch(e){if((e as DOMException)?.name!=='AbortError')notify(t('shareUnavailable'))}
 }
 return <>
  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
   <Button variant="secondary" size="md" icon={copied==='link'?<Check/>:<Link2/>} success={copied==='link'} onClick={()=>copy('link')}>{copied==='link'?t('copied'):t('copyLink')}</Button>
   <Button variant="ghost" size="sm" icon={copied==='code'?<Check/>:<Copy/>} success={copied==='code'} onClick={()=>copy('code')}>{copied==='code'?t('copied'):t('copyCode')}</Button>
   {canShare&&<IconButton label={t('share')} onClick={share}><Share2/></IconButton>}
  </div>
  {failed?<div role="alert" className="mx-auto mt-3 max-w-sm rounded-[12px] border-2 border-pink/40 p-3 text-left">
    <p className="text-sm font-bold text-pink">{t('copyFailedTitle')}</p>
    <p className="mt-0.5 text-xs text-ivory/75">{t('copyFailedBody')}</p>
    <input readOnly aria-label={failed==='link'?t('linkLabel'):t('codeLabel')} value={failed==='link'?inviteUrl:code} onFocus={e=>e.currentTarget.select()} className="mt-2 w-full rounded-[10px] border-2 border-ivory/20 bg-obsidian px-3 py-2 text-sm"/>
   </div>
   :<p role="status" className="mt-2 min-h-5 text-sm text-ivory/75">{copied==='link'?t('linkCopied'):copied==='code'?t('codeCopied'):hasPartner?t('partnerHere'):t('sendInvite')}</p>}
 </>;
}

function HeatPicker({room,me,hostName,partner,emit}:{room:RoomView;me:PlayerView;hostName:string;partner?:PlayerView;emit:Emit}){
 const t=useTranslations('lobby'),th=useTranslations('heat'),tc=useTranslations('common');
 return <section className="mt-6" aria-labelledby="heat-title">
  <div className="flex items-end justify-between gap-3"><h2 id="heat-title" className="display min-w-0 text-2xl">{t('heatTitle')}</h2><p className="shrink-0 text-xs text-ivory/70">{me.isHost?t('heatYouSet'):t('heatHostSets',{host:hostName})}</p></div>
  <p className="mt-1 text-xs leading-5 text-ivory/70">{me.isHost?(partner?t('heatHostNote',{name:partner.nickname}):t('heatHostNoteSolo')):t('heatGuestNote',{host:hostName})}</p>
  {me.isHost
   ?<RisingHeatSelector value={room.agreedHeat} labelledBy="heat-title" caption={th('caption')} onChange={async level=>(await emit('room:set_heat',{maxHeat:level})).ok}/>
   :<RisingHeatSelector value={room.agreedHeat} labelledBy="heat-title" caption={th('setBy',{name:hostName})} readOnly/>}
 </section>;
}

function GamePicker({room,isHost,emit,notify}:{room:RoomView;isHost:boolean;emit:Emit;notify:Notify}){
 const t=useTranslations('lobby'),te=useTranslations('errors.action'),tc=useTranslations('common');const games=useGames();
 return <section className="mt-6" aria-labelledby="picker-title">
  <div className="flex items-end justify-between gap-3"><h2 id="picker-title" className="display min-w-0 text-2xl">{t('gameTitle')}</h2><p className="shrink-0 text-xs text-ivory/70">{isHost?t('gameYouPick'):t('gameHostPicks')}</p></div>
  <div role="radiogroup" aria-label={t('gameGroup')} className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-2">{games.map(g=>{const on=room.selectedGame===g.id;return <button key={g.id} role="radio" aria-checked={on} aria-disabled={!isHost||!g.available}
   onClick={()=>{if(!isHost){notify(te('hostOnlyGame'));return}if(!g.available){notify(t('noteComingSoon',{game:g.title}));return}if(!on){playCue('flip');emit('room:select_game',{gameSlug:g.id})}}}
   className="group w-[8.5rem] shrink-0 snap-start rounded-[15px] text-left transition-transform active:scale-[.98] focus-visible:outline-offset-4">
   <span className={`card-frame relative block aspect-[2/3] !p-[6px] transition-[box-shadow,transform] duration-200 ${on?'ring-[3px] ring-pink ring-offset-2 ring-offset-obsidian':g.available&&isHost?'group-hover:-translate-y-1':''}`}>
    <span className={`card-art block h-full w-full ${g.available?'':'grayscale-[.7]'}`}><Image src={g.cover} alt="" fill sizes="136px" className="object-cover"/></span>
    {!g.available&&<span className="absolute inset-x-0 -bottom-2.5 mx-auto flex w-max items-center gap-1 rounded-[8px] bg-obsidian px-2 py-1 text-[9px] font-bold uppercase leading-none tracking-widest ring-2 ring-ivory"><Lock size={10}/>{t('soon')}</span>}
    {on&&<span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-pink text-obsidian ring-2 ring-obsidian"><Check size={16}/></span>}
   </span>
   <span lang="en" className="display mt-3 block truncate text-lg">{g.title}</span>
   <span className="block truncate text-[11px] text-ivory/75">{g.tagline}</span>
   <span className={`mt-1 block truncate text-[10px] font-bold uppercase tracking-wider ${g.available?'text-pink':'text-ivory/55'}`}>{g.tierLabel} · {g.available?(on?t('selected'):t('playNow')):tc('comingSoon')}</span>
  </button>})}</div>
 </section>;
}
