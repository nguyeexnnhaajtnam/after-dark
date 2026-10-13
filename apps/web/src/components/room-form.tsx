'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,History} from 'lucide-react';
import {useTranslations} from 'next-intl';
import type {RoomCredentials} from '@after-dark/contracts';
import {findCredentialsByCode,loadLastCredentials,post,saveCredentials,type RoomResponse} from '@/lib/api';
import {pageErrorKey} from '@/i18n/server-messages';
import {Button,ButtonLink} from './ui/button';
import {LanguageSwitcher} from './ui/language-switcher';

export function RoomForm({mode}:{mode:'create'|'join'}){
 const t=useTranslations('room'),tc=useTranslations('common'),te=useTranslations('errors');
 const [nickname,setNickname]=useState('');const [code,setCode]=useState('');const [previous,setPrevious]=useState<RoomCredentials|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const router=useRouter();
 // Invitation links carry the room code, so the guest only has to type a name.
 useEffect(()=>{if(mode!=='join')return;setPrevious(loadLastCredentials());const invited=new URLSearchParams(window.location.search).get('code');if(invited)setCode(invited.replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase())},[mode]);
 async function submit(e:React.FormEvent){e.preventDefault();setError('');const normalizedCode=code.toUpperCase();if(mode==='join'){const existing=findCredentialsByCode(normalizedCode);if(existing){router.push(`/room/${existing.roomId}`);return}}setLoading(true);try{const data=await post<RoomResponse>(mode==='create'?'/rooms':'/rooms/join',mode==='create'?{nickname}:{nickname,code:normalizedCode});saveCredentials(data.credentials);router.push(`/room/${data.credentials.roomId}`)}catch(e){setError(e instanceof Error?e.message:'fetch failed')}finally{setLoading(false)}}
 const copy=mode==='create'?'create':'join';const errorKey=error?pageErrorKey(error):null;
 return <div className="w-full max-w-md">
  <div className="mb-10 flex items-center justify-between gap-3"><ButtonLink href="/" variant="ghost" size="sm" icon={<ArrowLeft/>} className="-ml-2">{tc('backHome')}</ButtonLink><LanguageSwitcher/></div>
  <p className="text-xs font-bold uppercase tracking-[.35em] text-pink">{t(`${copy}.eyebrow`)}</p><h1 className="display mt-2 text-[clamp(3.25rem,16vw,4.5rem)]">{t(`${copy}.title`)}</h1><p className="mt-3 text-ivory/75">{t(`${copy}.description`)}</p>
  {mode==='join'&&previous&&<button type="button" onClick={()=>router.push(`/room/${previous.roomId}`)} className="mt-7 flex w-full items-center gap-4 rounded-[14px] border-[1.5px] border-pink/45 bg-[var(--plum-surface)] p-4 text-left transition hover:border-pink hover:bg-[var(--plum-surface-hi)] active:translate-y-px"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink text-ink"><History size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{t('rejoin')}</strong><span className="text-xs text-ivory/50">{t('rejoinDetail',{code:previous.code})}</span></span><ArrowRight size={18}/></button>}
  {mode==='join'&&previous&&<div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[.25em] text-ivory/30"><span className="h-px flex-1 bg-ivory/10"/>{t('orJoinAnother')}<span className="h-px flex-1 bg-ivory/10"/></div>}
  <form onSubmit={submit} className={mode==='join'&&previous?'space-y-5':'mt-10 space-y-5'}>
   {mode==='join'&&<label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-widest">{t('codeLabel')}</span><input required minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/[^a-z0-9]/gi,'').slice(0,6))} placeholder="ABC123" className="focus-ring w-full rounded-2xl border border-ivory/20 bg-ivory/5 px-5 py-5 text-center text-3xl font-bold uppercase tracking-[.35em] placeholder:text-ivory/15"/></label>}
   <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-widest">{t('nicknameLabel')}</span><input required maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={t('nicknamePlaceholder')} className="focus-ring w-full rounded-2xl border border-ivory/20 bg-ivory/5 px-5 py-4 placeholder:text-ivory/25"/></label>
   {errorKey&&<div role="alert" className="rounded-xl bg-crimson/15 p-3"><strong className="block text-sm text-pink">{te(`${errorKey}.title`)}</strong><span className="mt-1 block text-xs text-ivory/55">{te(`${errorKey}.description`)}</span></div>}
   <Button type="submit" variant="primary" size="lg" block loading={loading} loadingLabel={t(`${copy}.loading`)} iconAfter={<ArrowRight/>}>{t(`${copy}.action`)}</Button>
  </form>
  <p className="mt-6 text-center text-xs leading-5 text-ivory/60">{t('privacyNote')}</p>
  <p className="mt-3 text-center text-sm">{mode==='create'?<Link href="/room/join" className="underline underline-offset-4 hover:text-pink">{t('toJoin')}</Link>:<Link href="/room/create" className="underline underline-offset-4 hover:text-pink">{t('toCreate')}</Link>}</p>
 </div>
}
