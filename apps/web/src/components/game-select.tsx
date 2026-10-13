'use client';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Clock,Lock,Users} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {games as catalog,useGames} from '@/lib/games';
import {playCue} from '@/lib/sound';
import {Button,ButtonLink} from './ui/button';
import {IconButton} from './ui/icon-button';
import {LanguageSwitcher} from './ui/language-switcher';

const EASE='cubic-bezier(.2,.8,.2,1)';
const N=catalog.length,HALF=Math.floor(N/2);
const wrap=(i:number)=>((i%N)+N)%N;
/** Circular distance from the active card, in the range -HALF…HALF, so the fan loops forever in both directions. */
const offset=(i:number,active:number)=>wrap(i-active+HALF)-HALF;

export function GameSelect(){
 const router=useRouter();const games=useGames(),t=useTranslations('gameSelect'),tc=useTranslations('common'),tcat=useTranslations('catalog');
 const [{active,prev},setPos]=useState({active:0,prev:0}),[dealt,setDealt]=useState(false);const start=useRef<{x:number;y:number}|null>(null);
 const game=games[active];
 const go=useCallback((next:number)=>{setPos(p=>{const target=wrap(next);if(target!==p.active)playCue('flip');return {active:target,prev:p.active}});setDealt(false)},[]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='ArrowRight')go(active+1);else if(e.key==='ArrowLeft')go(active-1);else if(e.key==='Escape')router.push('/')};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[active,go,router]);
 function deal(){if(!game.available)return;playCue('press');setDealt(true);setTimeout(()=>router.push(`/room/create?game=${game.id}`),650)}

 return <main className="relative flex h-[100svh] min-h-[520px] flex-col overflow-hidden px-4 pb-[max(.75rem,var(--safe-bottom))] pt-[max(.75rem,var(--safe-top))]">
  <header className="relative z-20 flex items-center justify-between gap-2">
   <ButtonLink href="/" variant="ghost" size="sm" icon={<ArrowLeft/>} aria-label={t('back')} className="-ml-2 shrink-0"><span className="max-[399px]:sr-only">{t('back')}</span></ButtonLink>
   <h1 className="display min-w-0 truncate text-center text-[clamp(1.05rem,4.6vw,1.6rem)] tracking-[.06em]">{t('title')}</h1>
   <div className="flex shrink-0 items-center gap-2">
    <span className="display tabular-nums text-[clamp(1rem,4vw,1.4rem)]" aria-label={t('counter',{current:active+1,total:N})}>{String(active+1).padStart(2,'0')} <span className="text-ivory/50">/ {String(N).padStart(2,'0')}</span></span>
    <LanguageSwitcher variant="compact"/>
   </div>
  </header>

  <section aria-roledescription="carousel" aria-label={t('carousel')} className="relative flex flex-1 items-center justify-center"
   onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY}}}
   onPointerUp={e=>{if(!start.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y;start.current=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))go(active+(dx<0?1:-1))}}
   onPointerCancel={()=>{start.current=null}} style={{touchAction:'pan-y'}}>
   <div aria-hidden className="absolute left-1/2 top-1/2 aspect-square w-[min(118vw,58svh,640px)] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{background:game.ground,transition:`background-color .5s ${EASE}`}}/>
   <div className="relative h-[clamp(168px,38svh,440px)] [aspect-ratio:2/3]">
    {games.map((g,i)=>{const d=offset(i,active),abs=Math.abs(d);
     // A card that wraps from one end of the fan to the other jumps instead of sliding across the active card.
     const wrapped=Math.abs(d-offset(i,prev))>HALF;
     return <button key={g.id} type="button" tabIndex={d===0?-1:0} aria-label={d===0?t('selected',{game:g.title}):t('select',{game:g.title})} onClick={()=>go(i)}
      className="card-frame absolute inset-0 select-none" style={{transform:`translateX(${d*68}%) translateY(${abs*6}%) rotate(${d*9}deg) scale(${d===0?1:.84})`,opacity:abs>=2?.35:1,zIndex:10-abs,transition:wrapped?'none':`transform .5s ${EASE}, opacity .5s ${EASE}`}}>
      <span className="card-art block h-full w-full"><Image src={g.cover} alt={t('cover',{game:g.title})} fill draggable={false} sizes="(max-width:640px) 60vw, 300px" priority={abs<=1} className="object-cover"/></span>
     </button>})}
    {!game.available&&<span key={game.id} className="pop-in pointer-events-none absolute left-0 right-0 top-full z-30 mx-auto mt-3 flex w-max items-center gap-1.5 rounded-full bg-obsidian px-3.5 py-1.5 text-[11px] font-bold uppercase leading-none tracking-[.16em] text-ivory ring-2 ring-ivory"><Lock size={12}/>{tc('comingSoon')}</span>}
   </div>
   <IconButton label={t('previous')} shape="round" onClick={()=>go(active-1)} className="!absolute left-0 z-20 !h-12 !w-12 sm:left-[max(1rem,calc(50%-27rem))]"><ArrowLeft/></IconButton>
   <IconButton label={t('next')} shape="round" onClick={()=>go(active+1)} className="!absolute right-0 z-20 !h-12 !w-12 sm:right-[max(1rem,calc(50%-27rem))]"><ArrowRight/></IconButton>
  </section>

  <section className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center" aria-live="polite">
   <div className="flex items-center gap-2" role="tablist" aria-label={t('tabs')}>{games.map((g,i)=><button key={g.id} role="tab" aria-selected={i===active} aria-label={g.title} onClick={()=>go(i)} className="grid min-h-6 place-items-center px-0.5"><span className="block h-2 rounded-full transition-all duration-500" style={{width:i===active?28:8,background:i===active?'var(--ivory)':'rgba(247,243,236,.35)'}}/></button>)}</div>
   <h2 lang="en" className="display mt-1.5 text-[clamp(2.1rem,min(13vw,7.5svh),4.5rem)]">{game.title}</h2>
   <p className="mt-1 text-[15px] font-medium text-ivory/85">{game.tagline}</p>
   <ul className="mt-3 flex flex-wrap justify-center gap-2">
    <li className="meta-pill"><Clock size={14}/>{game.duration}</li>
    <li className="meta-pill"><Users size={14}/>{tcat('players')}</li>
    <li className="meta-pill" aria-label={t('intensity',{tier:game.tierLabel})}><span aria-hidden className="flex items-end gap-[3px]">{[1,2,3].map(n=><span key={n} className="block w-[4px] rounded-[1px]" style={{height:5+n*3,background:n<=game.tier?'var(--pink)':'rgba(247,243,236,.3)'}}/>)}</span>{game.tierLabel}</li>
   </ul>
   {game.available
    ?<Button variant="primary" size="lg" onClick={deal} loading={dealt} loadingLabel={t('dealing')} className="mt-[2svh] min-w-[14rem]">{t('deal')}</Button>
    :<Button variant="primary" size="lg" disabled aria-describedby="locked-hint" icon={<Lock/>} className="mt-[2svh] min-w-[14rem]">{tc('comingSoon')}</Button>}
   <p id="locked-hint" className="mt-3 text-[11px] text-ivory/65">{game.available?t('hint'):t('lockedHint')}</p>
  </section>
 </main>;
}
