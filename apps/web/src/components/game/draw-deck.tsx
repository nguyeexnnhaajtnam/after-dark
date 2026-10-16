'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {useLocaleSwitch} from '@/i18n/locale-provider';
import {playCue} from '@/lib/sound';

/** The three card types a player draws: art lives in public/images/card-back/{locale} and public/images/card-front. */
export type DrawArt='secret-mission'|'power-card'|'forfeit';
const SHUFFLE_MS=1300;
const calm=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch{return false}};

/**
 * A face-down draw: the deck is shuffled, spread, and the player taps one card. The server decides what lies under it,
 * so the spread only knows how many cards there are. Once `result` arrives the drawn card turns over to show it.
 * A watching partner (`canDraw` false) sees the deck shuffle until the draw lands, then the same card turn over.
 */
export function DrawDeck({art,cards,canDraw,pending,onDraw,result,dark,watching}:{art:DrawArt;cards:number;canDraw:boolean;pending?:boolean;onDraw?:(index:number)=>void;result?:ReactNode;dark?:boolean;watching?:string}){
 const t=useTranslations('draw'),{locale}=useLocaleSwitch();
 const [stage,setStage]=useState<'shuffle'|'spread'|'picked'>(()=>calm()?'spread':'shuffle');
 const [picked,setPicked]=useState<number|null>(null);const sent=useRef(false);
 useEffect(()=>{if(stage!=='shuffle'||!canDraw)return;const id=setTimeout(()=>{setStage('spread');playCue('flip')},SHUFFLE_MS);return()=>clearTimeout(id)},[stage,canDraw]);
 // A rejected draw (stale state, lost connection) puts the card back so another can be tapped.
 useEffect(()=>{if(stage==='picked'&&sent.current&&!pending&&!result){sent.current=false;setPicked(null);setStage('spread')}},[stage,pending,result]);
 const n=Math.max(1,cards),back=`/images/card-back/${locale}/${art}.webp`;
 if(result)return <DrawReveal art={art} back={back} dark={dark}>{result}</DrawReveal>;
 const pick=(i:number)=>{if(stage!=='spread'||!canDraw)return;setPicked(i);setStage('picked');sent.current=true;onDraw?.(i)};
 const shuffling=stage==='shuffle';
 return <div className={`draw-deck ${canDraw?'':'draw-deck-watch'}`} data-stage={shuffling?'shuffle':'spread'}>
  <div className="draw-table" role="group" aria-label={canDraw?t('pickAria',{count:n}):watching}>
   {Array.from({length:n},(_,i)=>{const o=i-(n-1)/2,on=picked===i;
    return <button key={i} type="button" disabled={!canDraw||stage!=='spread'} aria-label={t('cardAria',{number:i+1,count:n})} onClick={()=>pick(i)}
     className={`draw-card ${shuffling?(i%2?'draw-riffle-b':'draw-riffle-a'):''} ${on?'draw-card-picked':''} ${picked!==null&&!on?'draw-card-left':''}`}
     style={{['--o' as string]:o,['--a' as string]:Math.abs(o),['--i' as string]:i,zIndex:on?20:10+i}}>
     <Image src={back} alt="" fill sizes="120px" draggable={false}/>
    </button>})}
  </div>
  <p className="draw-caption" aria-live="polite">{!canDraw?watching:shuffling?t('shuffling'):stage==='picked'?t('turning'):t('pick')}</p>
 </div>;
}

/** A small face-down stack for "draw the next card". It shows no card type: what comes next stays hidden until drawn. */
export function DeckIcon(){return <span aria-hidden className="deck-icon"><span/><span/><span/></span>}

/** The drawn card turning over: its back, then the type's front template with what was drawn printed on it. */
function DrawReveal({art,back,dark,children}:{art:DrawArt;back:string;dark?:boolean;children:ReactNode}){
 const [face,setFace]=useState<'back'|'front'>(()=>calm()?'front':'back');const stage=useRef<HTMLDivElement>(null);
 // Once turned, bring the drawn card's text into view (it can land below the fold inside a long card).
 useEffect(()=>{if(face==='front')stage.current?.scrollIntoView({block:'nearest',behavior:calm()?'auto':'smooth'})},[face]);
 useEffect(()=>{if(face==='front')return;const id=setTimeout(()=>setFace('front'),900);return()=>clearTimeout(id)},[face]);
 return <div className="draw-deck"><div ref={stage} className="draw-reveal-stage">
  {face==='back'?<div aria-hidden className="draw-reveal draw-reveal-back" onAnimationEnd={e=>{if(e.animationName==='card-turn-out'){setFace('front');playCue('reveal')}}}><Image src={back} alt="" fill sizes="260px" draggable={false}/></div>
   :<div className={`draw-reveal draw-reveal-front card-turn-in ${dark?'text-ivory':'text-obsidian'}`} style={{backgroundImage:`url(/images/card-front/${art}.webp)`}}><div className="draw-reveal-body">{children}</div></div>}
 </div></div>;
}
