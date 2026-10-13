'use client';
import {useEffect,useRef,useState} from 'react';

// React side of the branded event motion in globals.css (fx-* classes). Everything here is decorative and aria-hidden.

/** softFlash overlay for an event surface; the parent must be position:relative. Remount it (e.g. with a key) to replay. */
export function EventFlash({tone='ember'}:{tone?:'ember'|'rose'|'plum'}){
 return <span aria-hidden className="fx-flash" data-tone={tone}/>;
}

/** Bumps on every increase of `value` after the first render, so `key={tick}` replays a one-shot animation like sparkTick. */
export function useRiseTick(value:number){
 const last=useRef(value);const [tick,setTick]=useState(0);
 useEffect(()=>{if(value>last.current)setTick(t=>t+1);last.current=value},[value]);
 return tick;
}
