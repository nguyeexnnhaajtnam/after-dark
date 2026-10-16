'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {GameStateView,PowerKind} from '@after-dark/contracts';
import {powerReasonKey} from '@/i18n/server-messages';
import {Button} from '../ui/button';
import {Sheet} from './sheet';
import {TypeEmblem,type EmblemSize} from './type-emblem';

/** Card copy comes from the viewer's catalog by kind; the server only decides what the card does. Every kind wears the one Power Card emblem; its alias tells them apart. */
export function PowerCardFace({kind,emblem='tray'}:{kind:PowerKind;emblem?:EmblemSize}){
 const t=useTranslations(`powers.kinds.${kind}`);
 return <div className="flex items-start gap-3">
  <div className="min-w-0 flex-1"><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-crimson">{t('alias')}</p><p className="display text-xl">{t('title')}</p><p className="mt-0.5 text-sm leading-5">{t('description')}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-obsidian/60">{t('requirement')}</p></div>
  <TypeEmblem type="POWER_CARD" size={emblem} className="-mr-1 -mt-1"/></div>;
}

export function PowerTray({g,onUse,onClose,using}:{g:GameStateView;onUse:(id:string)=>void;onClose:()=>void;using:boolean}){
 const t=useTranslations('powers');const [confirming,setConfirming]=useState<string|null>(null);
 return <Sheet eyebrow={t('eyebrow',{count:g.inventory.length,limit:g.inventoryLimit})} title={t('title')} onClose={onClose}>
  {g.inventory.length===0
   ?<div className="rounded-[14px] border-2 border-dashed border-obsidian/25 p-4 text-sm leading-6"><p className="font-bold">{t('emptyTitle')}</p><p className="mt-1">{t('emptyBody',{limit:g.inventoryLimit})}</p></div>
   :<ul className="space-y-3">{g.inventory.map(p=>{const reason=powerReasonKey(p.reason);return <li key={p.id} className={`rounded-[14px] border-2 p-3 ${p.status==='ARMED'?'border-crimson bg-crimson/10':'border-obsidian/15'}`}>
    <PowerCardFace kind={p.kind}/>
    <div className="mt-3">
     {p.status==='ARMED'?<p role="status" className="rounded-[10px] bg-crimson px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-ivory">{t('armed')}</p>
      :confirming===p.id?<div className="rounded-[12px] bg-obsidian p-3 text-ivory"><p className="text-sm leading-5">{t(`kinds.${p.kind}.confirm`)}</p><div className="mt-3 flex flex-col-reverse gap-2 min-[360px]:flex-row"><Button variant="ghost" disabled={using} onClick={()=>setConfirming(null)}>{t('saveForLater')}</Button><Button variant="primary" size="md" className="flex-1" loading={using} loadingLabel={t('playing')} onClick={()=>onUse(p.id)}>{t(`kinds.${p.kind}.useNow`)}</Button></div></div>
      :<><Button variant="primary" size="md" block disabled={!p.usable} surface={p.usable?'dark':'light'} onClick={()=>setConfirming(p.id)}>{t('use')}</Button>{!p.usable&&reason&&<p className="mt-2 text-xs leading-5 text-obsidian/75">{t(`reasons.${reason}`)}</p>}</>}
    </div>
   </li>})}</ul>}
  <p className="mt-4 text-xs leading-5 text-obsidian/70">{t('footer')}</p>
 </Sheet>;
}
