'use client';
import {useTranslations} from 'next-intl';
import {ChemistrySignal} from './ui/chemistry-signal';
export function ConnectionStatus({connected}:{connected:boolean}){
 const t=useTranslations('connection');
 return <div role="status" aria-live="polite" className={`flex min-w-0 items-center gap-2 ${connected?'text-ivory/80':'text-pink'}`}><ChemistrySignal state={connected?'live':'lost'}/><span className="min-w-0"><strong className="block truncate text-[10px] uppercase tracking-widest sm:text-xs">{connected?t('connected'):t('reconnecting.title')}</strong>{!connected&&<span className="block text-[10px] normal-case tracking-normal text-ivory/45">{t('reconnecting.description')}</span>}</span></div>;
}
