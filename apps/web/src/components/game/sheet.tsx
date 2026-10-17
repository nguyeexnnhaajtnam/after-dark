'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';

/** Bottom sheet on phones, centred card on wider screens. Esc and the backdrop close it when `onClose` is given. `reveal` unveils the title for event sheets. */
export function Sheet({title,eyebrow,onClose,children,tone='ivory',labelledBy='sheet-title',reveal=false}:{title:string;eyebrow?:string;onClose?:()=>void;children:ReactNode;tone?:'ivory'|'dark';labelledBy?:string;reveal?:boolean}){
 const panel=useRef<HTMLDivElement>(null);const t=useTranslations('common');
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLElement>('button:not(:disabled),[href]')?.focus();
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose?.()};window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);previous?.focus?.()}},[onClose]);
 return <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
  <button aria-label={t('close')} tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-obsidian/85"/>
  <div ref={panel} className={`pop-in relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] px-5 pb-[max(1.25rem,var(--safe-bottom))] pt-5 sm:rounded-[22px] ${tone==='ivory'?'bg-ivory text-obsidian':'sheet-dark border-2 border-ivory bg-obsidian text-ivory'}`}>
   <div className="min-w-0">{eyebrow&&<p className={`text-[10px] font-bold uppercase tracking-[.25em] ${tone==='ivory'?'text-crimson':'text-pink'}`}>{eyebrow}</p>}<h2 id={labelledBy} className={`display mt-1 text-[clamp(1.6rem,7vw,2.2rem)] ${reveal?'fx-headline':''}`}>{title}</h2></div>
   <div className="mt-3">{children}</div>
  </div>
 </div>;
}

export const newActionId=()=>typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
