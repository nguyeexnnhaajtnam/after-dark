'use client';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {LanguageSwitcher} from './ui/language-switcher';

export function Header(){
 const t=useTranslations('header');
 return <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-5 py-5 md:px-10">
  <Link href="/" lang="en" className="display text-3xl tracking-[.16em]">AFTER <span className="text-crimson">DARK</span></Link>
  <div className="flex items-center gap-2">
   <LanguageSwitcher/>
   <Link href="/games" className="group relative flex min-h-11 items-center gap-2 px-1 text-xs font-bold uppercase tracking-[.18em] text-ivory/70 transition-colors hover:text-ivory focus-visible:outline-none">
    <span className="hidden sm:inline">{t('explore')}</span><span className="sm:hidden">{t('exploreShort')}</span>
    <ArrowUpRight size={16} strokeWidth={1.8} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
    <span aria-hidden className="absolute inset-x-0 bottom-1 h-px origin-left scale-x-50 bg-pink/60 transition-transform duration-300 group-hover:scale-x-100"/>
   </Link>
  </div>
 </header>
}
