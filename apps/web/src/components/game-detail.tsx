'use client';
import {ArrowLeft} from 'lucide-react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import type {GameSlug} from '@after-dark/contracts';
import {useGames} from '@/lib/games';
import {Header} from './header';
import {Button,ButtonLink} from './ui/button';
import {TonightSetup} from './tonight-setup';

export function GameDetail({slug}:{slug:GameSlug}){
 const game=useGames().find(g=>g.id===slug)!;const t=useTranslations('gameDetail'),tc=useTranslations('common'),ts=useTranslations('gameSelect');
 return <main className="min-h-screen px-5 pb-20 pt-28 md:px-10">
  <Header/>
  <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
   <div className="card-frame relative mx-auto aspect-[2/3] w-full max-w-sm">
    <div className="card-art h-full w-full"><Image src={game.cover} alt={ts('cover',{game:game.title})} fill className="object-cover" priority/></div>
    {!game.available&&<span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-obsidian px-4 py-1.5 text-xs font-bold uppercase tracking-[.2em] ring-2 ring-ivory">{tc('comingSoon')}</span>}
   </div>
   <div>
    <ButtonLink href="/games" variant="ghost" size="sm" icon={<ArrowLeft/>} className="-ml-2 mb-8">{t('allGames')}</ButtonLink>
    <span className="display text-5xl text-crimson/50">{game.number}</span>
    <h1 lang="en" className="display text-7xl leading-none md:text-9xl">{game.title}</h1>
    <p className="mt-2 text-xl italic text-pink">{game.tagline}</p>
    <p className="mt-7 max-w-xl text-lg leading-8 text-ivory/60">{game.description}</p>
    <TonightSetup duration={game.duration} tier={game.tierLabel}/>
    <div className="grid gap-8 border-y border-ivory/10 py-7 sm:grid-cols-2">
     <div><h2 className="text-xs font-bold uppercase tracking-[.25em] text-pink">{t('howToPlay')}</h2><ul className="mt-4 space-y-3 text-sm text-ivory/60">{game.rules.map(rule=><li key={rule}>— {rule}</li>)}</ul></div>
     <div><h2 className="text-xs font-bold uppercase tracking-[.25em] text-pink">{t('inTheDeck')}</h2><ul className="mt-4 space-y-3 text-sm text-ivory/60">{game.types.map(type=><li key={type}>— {type}</li>)}</ul></div>
    </div>
    {game.available?<ButtonLink href="/room/create" variant="primary" size="lg" className="mt-8">{t('deal')}</ButtonLink>:<><Button variant="primary" size="lg" disabled className="mt-8">{tc('comingSoon')}</Button><p className="mt-2 text-xs text-ivory/65">{t('lockedNote')}</p></>}
   </div>
  </div>
 </main>;
}
