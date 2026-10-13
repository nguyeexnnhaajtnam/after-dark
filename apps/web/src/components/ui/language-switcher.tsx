'use client';
import {Languages} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {LOCALES,type Locale} from '@/i18n/config';
import {useLocaleSwitch} from '@/i18n/locale-provider';

const SHORT:Record<Locale,string>={vi:'VI',en:'EN'};

/**
 * `segmented` shows both languages (title, forms, lobby); `compact` is a single toggle for tight bars (game picker, HUD).
 * Language names stay in their own language so either reader can find theirs.
 */
export function LanguageSwitcher({variant='segmented',className=''}:{variant?:'segmented'|'compact';className?:string}){
 const {locale,setLocale}=useLocaleSwitch();const t=useTranslations('lang');
 if(variant==='compact'){
  const next=locale==='vi'?'en':'vi';
  return <button type="button" onClick={()=>setLocale(next)} lang={next} aria-label={t('switchTo',{language:t(next)})} title={t('switchTo',{language:t(next)})}
   className={`lang-toggle ${className}`}><Languages aria-hidden/><span aria-hidden>{SHORT[next]}</span></button>;
 }
 return <div role="radiogroup" aria-label={t('label')} className={`lang-switch ${className}`}>
  {LOCALES.map(l=><button key={l} type="button" role="radio" aria-checked={locale===l} lang={l} aria-label={t(l)} onClick={()=>setLocale(l)} className="lang-option">{SHORT[l]}</button>)}
 </div>;
}
