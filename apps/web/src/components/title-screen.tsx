'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useGames} from '@/lib/games';
import {playCue} from '@/lib/sound';
import {useUI} from '@/store/use-ui';
import {AgeGate} from './age-gate';
import {Button,ButtonLink} from './ui/button';
import {LanguageSwitcher} from './ui/language-switcher';

export function TitleScreen(){
 const {sound,toggleSound,hydrate}=useUI();const t=useTranslations('title');const steps=t.raw('steps') as Array<{title:string;text:string}>;
 useEffect(()=>{hydrate()},[hydrate]);
 return <main className="relative flex h-[100svh] min-h-[560px] flex-col overflow-hidden px-4 pb-[max(.75rem,var(--safe-bottom))] pt-[max(.75rem,var(--safe-top))]" style={{['--wm' as string]:'clamp(3.1rem,min(21vw,10svh),8.5rem)'}}>
  <AgeGate/>
  <header className="relative z-20 flex items-center justify-between">
   <span className="pill-outline shrink-0 whitespace-nowrap text-ivory">{t('adultsOnly')}</span>
   <div className="flex items-center gap-1"><LanguageSwitcher/><Button variant="ghost" size="sm" aria-pressed={sound} icon={sound?<Volume2/>:<VolumeX/>} onClick={()=>{toggleSound();if(!sound)setTimeout(()=>playCue('press'))}}><span className="max-[419px]:sr-only">{sound?t('soundOn'):t('soundOff')}</span></Button></div>
  </header>

  <section className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
   {/* Circles are anchored to the DARK line so the black word always sits on crimson. */}
   <div aria-hidden className="pointer-events-none absolute left-1/2 -z-10" style={{top:'calc(var(--wm) * 1.42 + 4svh)'}}>
    <div className="absolute left-0 top-0 aspect-square w-[min(150vw,92svh,980px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plum"/>
    <div className="absolute left-0 top-0 aspect-square w-[min(92vw,56svh,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-crimson"/>
   </div>
   <h1 lang="en" className="display" style={{fontSize:'var(--wm)'}}><span className="block">After</span><span className="block text-obsidian">Dark</span></h1>
   <p className="display mt-[1svh] text-[clamp(1.1rem,3.2svh,1.6rem)] tracking-[.06em]">{t('tagline')}</p>
   <Deck/>
   <ButtonLink href="/room/create" variant="marquee" size="lg" onClick={()=>playCue('press')} className="mt-[1.8svh] !px-8 !text-[26px]">{t('start')}</ButtonLink>
   <div className="mt-3 flex items-center gap-4 text-sm font-medium">
    <Link href="/games" className="underline decoration-2 underline-offset-4 hover:text-pink">{t('explore')}</Link>
    <span aria-hidden className="text-ivory/40">·</span>
    <Link href="/room/join" className="text-ivory/75 underline-offset-4 hover:text-pink hover:underline">{t('haveCode')}</Link>
   </div>
  </section>

  <ol className="relative z-10 mx-auto mt-2 grid w-full max-w-2xl grid-cols-3 gap-2 border-t-2 border-ivory/15 pt-3">
   {steps.map(({title,text},i)=><li key={i} className="min-w-0 text-left"><span className="display text-xl text-pink">0{i+1}</span><p className="text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-xs">{title}</p><p className="mt-0.5 text-[10.5px] leading-snug text-ivory/75 sm:text-xs [@media(max-height:620px)]:hidden">{text}</p></li>)}
  </ol>
 </main>;
}

function Deck(){
 const games=useGames(),t=useTranslations('title');
 const [flipped,setFlipped]=useState(false),[index,setIndex]=useState(0),[dealing,setDealing]=useState(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const sample=games[index%games.length];
 function tap(){
  playCue('flip');
  // A quick re-tap while the card is still turning back deals the next sample straight away.
  if(dealing){clearTimeout(timer.current);setIndex(i=>i+1);setDealing(false);setFlipped(true);return}
  if(!flipped){setFlipped(true);return}
  // Flip back, then swap in the next sample once the front has turned out of view.
  setFlipped(false);setDealing(true);clearTimeout(timer.current);
  timer.current=setTimeout(()=>{setIndex(i=>i+1);setDealing(false)},350);
 }
 return <div className="mt-[1.8svh] flex flex-col items-center">
  <button onClick={tap} aria-label={flipped?t('deckShowing',{game:sample.title}):t('deckIdle')} className="relative h-[clamp(124px,25svh,330px)] [aspect-ratio:2/3] [perspective:1100px]">
   <span aria-hidden className="card-frame absolute inset-0 rotate-[-9deg] !p-[7px]"><span className="block h-full w-full rounded-[8px] bg-plum"/></span>
   <span aria-hidden className="card-frame absolute inset-0 rotate-[6deg] !p-[7px]"><span className="block h-full w-full rounded-[8px] bg-obsidian"/></span>
   <span className={`absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] ${flipped?'[transform:rotateY(180deg)]':''} ${dealing?'':''}`}>
    <CardBack/>
    <span className="card-frame absolute inset-0 flex flex-col text-left text-obsidian [backface-visibility:hidden] [transform:rotateY(180deg)]">
     <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-0.5 pb-1.5"><span className="whitespace-nowrap rounded-full bg-obsidian px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ivory">{sample.sample.category}</span><span className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wider text-crimson">{sample.title}</span></span>
     {/* Every sample's art is preloaded, so dealing never flashes the previous image. Inactive ones use display:none rather than opacity:
         stacked transparent layers inside a backface-hidden 3D face make GPU Chrome skip painting the card text. */}
     <span className="card-art relative block min-h-0 flex-1 basis-[46%]">{games.map(g=><Image key={g.id} src={g.cover} alt="" fill sizes="220px" priority className={`object-cover ${g.id===sample.id?'':'hidden'}`}/>)}</span>
     <span className="display block shrink-0 px-0.5 pt-1.5 text-[clamp(.78rem,2.15svh,1.3rem)] leading-[.95]">{sample.sample.title}</span>
     <span className="block shrink-0 px-0.5 pb-0.5 pt-1 text-[clamp(8px,1.3svh,12px)] leading-snug text-obsidian/75">{sample.sample.instruction}</span>
    </span>
   </span>
  </button>
  <p aria-live="polite" className="hint-pulse mt-[1.6svh] text-[11px] font-bold uppercase tracking-[.2em] text-ivory">{flipped?t('tapAgain'):t('tapDeck')}</p>
 </div>;
}

function CardBack(){
 return <span className="card-frame absolute inset-0 [backface-visibility:hidden]">
  <span className="pinstripes relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[8px]">
   <span className="absolute inset-[6px] rounded-[5px] border border-ivory/80"/>
   <span className="relative grid aspect-square w-[42%] place-items-center rounded-full bg-ivory"><span className="block aspect-square w-[38%] rotate-45 bg-crimson"/></span>
   <span lang="en" className="display relative mt-[9%] whitespace-nowrap bg-obsidian px-1.5 py-0.5 text-[clamp(.7rem,2.3svh,1.35rem)] tracking-[.1em] text-ivory">After <span className="text-crimson">Dark</span></span>
  </span>
 </span>;
}
