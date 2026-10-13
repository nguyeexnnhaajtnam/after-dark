'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {io,Socket} from 'socket.io-client';
import {LoaderCircle,LockKeyhole} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {Ack,ClientToServerEvents,GameAction,RoomView,ServerToClientEvents} from '@after-dark/contracts';
import {loadCredentials} from '@/lib/api';
import {useLocaleSwitch} from '@/i18n/locale-provider';
import {actionErrorKey,pageErrorKey,powerReasonKey} from '@/i18n/server-messages';
import {PlayScreen} from './game/play-screen';
import {Button} from './ui/button';
import {Lobby} from './lobby';
type GameSocket=Socket<ServerToClientEvents,ClientToServerEvents>;
const SOCKET_URL=process.env.NEXT_PUBLIC_SOCKET_URL||'http://localhost:4000';
export type Emit=(event:keyof ClientToServerEvents,payload:unknown)=>Promise<Ack<RoomView>>;
export type Notify=(message:string)=>void;

export function RoomScreen({roomId}:{roomId:string}){
 const t=useTranslations(),{locale}=useLocaleSwitch();
 const [room,setRoom]=useState<RoomView|null>(null),[socket,setSocket]=useState<GameSocket|null>(null),[connected,setConnected]=useState(false),[fatal,setFatal]=useState(''),[toast,setToast]=useState<{id:number;text:string}|null>(null);
 const router=useRouter();const credentials=useMemo(()=>typeof window==='undefined'?null:loadCredentials(roomId),[roomId]);const toastTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
 // The language is read through a ref so switching it never tears down the socket.
 const localeRef=useRef(locale);localeRef.current=locale;
 useEffect(()=>{if(!credentials)return;const s:GameSocket=io(SOCKET_URL,{transports:['websocket'],reconnection:true});setSocket(s);const sync=(v:RoomView)=>setRoom(v);
  s.on('connect',()=>{setConnected(true);s.emit('room:authenticate',{...credentials,locale:localeRef.current},r=>r.ok?setRoom(r.data):setFatal(r.error.message))});s.on('disconnect',()=>setConnected(false));
  s.on('room:state',sync);s.on('room:player_joined',sync);s.on('room:player_disconnected',sync);s.on('game:state',sync);return()=>{s.removeAllListeners();s.disconnect()}},[credentials]);
 // Card text is projected in this player's language only; the partner, the room and the game state are untouched.
 useEffect(()=>{if(!socket?.connected)return;socket.emit('room:set_locale',{locale},r=>{if(r.ok)setRoom(r.data)})},[locale,socket]);
 const notify=useCallback<Notify>(text=>{clearTimeout(toastTimer.current);setToast({id:Date.now(),text});toastTimer.current=setTimeout(()=>setToast(null),3200)},[]);
 const errorText=useCallback((message:string)=>{const reason=powerReasonKey(message);return reason?t(`powers.reasons.${reason}`):t(`errors.action.${actionErrorKey(message)}`)},[t]);
 // Rejected actions are reported in place; the authoritative state keeps arriving over the socket.
 const emit=useCallback<Emit>((event,payload)=>new Promise(resolve=>{if(!socket?.connected){notify(t('connection.offlineToast'));resolve({ok:false,error:{code:'OFFLINE',message:'Offline'}});return}
  (socket.emit as any)(event,payload,(r:Ack<RoomView>)=>{if(r.ok)setRoom(r.data);else notify(errorText(r.error.message));resolve(r)})}),[socket,notify,errorText,t]);
 if(!credentials||fatal){const key=fatal?pageErrorKey(fatal):'private';return <main className="grid min-h-[100svh] place-items-center p-5 text-center"><div><LockKeyhole className="mx-auto mb-5 text-pink" size={42}/><h1 className="display text-6xl">{t(`errors.${key}.title`)}</h1><p className="my-5 text-ivory/75">{t(`errors.${key}.description`)}</p><Button variant="primary" size="lg" onClick={()=>router.push('/')}>{t('common.backHome')}</Button></div></main>}
 if(!room)return <main className="grid min-h-[100svh] place-items-center p-5 text-center"><div role="status" aria-live="polite"><LoaderCircle className="mx-auto animate-spin text-pink" size={38}/><h1 className="display mt-5 text-5xl">{t('connection.connecting.title')}</h1><p className="mt-2 text-sm text-ivory/70">{t('connection.connecting.description')}</p></div></main>;
 const me=room.players.find(p=>p.id===credentials.playerId)!;
 return <>
  {room.status==='PLAYING'&&room.game
   ?<PlayScreen room={room} meId={me.id} connected={connected} act={(a:GameAction)=>emit('game:action',a)} lobby={()=>emit('game:return_lobby',{})}/>
   :<Lobby room={room} me={me} connected={connected} emit={emit} notify={notify}/>}
  <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-[max(.75rem,var(--safe-top))] z-[60] flex justify-center px-4">{toast&&<p key={toast.id} role="alert" className="pop-in pointer-events-auto max-w-sm rounded-2xl border-2 border-obsidian bg-ivory px-4 py-3 text-center text-sm font-medium text-obsidian shadow-[0_6px_0_#000]">{toast.text}</p>}</div>
 </>;
}
