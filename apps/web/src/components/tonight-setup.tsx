'use client';
import {Clock3,Flame,UsersRound} from 'lucide-react';
import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';

export function TonightSetup({duration,tier}:{duration:string;tier:string}){
 const t=useTranslations('gameDetail');
 return <section aria-labelledby="tonight-setup-title" className="my-8 rounded-[15px] border-2 border-ivory/15 px-5 py-5 sm:px-6">
  <h2 id="tonight-setup-title" className="mb-4 text-[10px] font-bold uppercase tracking-[.3em] text-pink">{t('setup')}</h2>
  <div className="grid grid-cols-3 gap-3">
   <MetaItem icon={<UsersRound size={18}/>} label={t('players')} value={t('madeForTwo')}/>
   <MetaItem icon={<Clock3 size={18}/>} label={t('pace')} value={duration}/>
   <MetaItem icon={<Flame size={18}/>} label={t('intensity')} value={tier}/>
  </div>
 </section>;
}

function MetaItem({icon,label,value}:{icon:ReactNode;label:string;value:string}){
 return <div className="flex min-w-0 items-start gap-2"><span className="mt-0.5 text-pink">{icon}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-ivory/60">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div></div>;
}
