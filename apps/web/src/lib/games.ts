import {useMemo} from 'react';
import {useTranslations} from 'next-intl';
import type {GameSlug} from '@after-dark/contracts';
/** Game-level vibe shown as three bars. In-game card heat (Sweet → Wild) is separate and set in the lobby. */
export type GameTier=1|2|3;
/** Language-neutral catalog data. Game names are brand names and never translated; everything else lives in messages/<locale>.json. */
export type GameBase={id:GameSlug;number:string;title:string;tier:GameTier;ground:string;available:boolean;cover:string};
export type GameInfo=GameBase&{tagline:string;description:string;duration:string;tierLabel:string;rules:string[];types:string[];sample:{category:string;title:string;instruction:string}};
export const games:GameBase[]=[
 {id:'read-my-mind',number:'01',title:'Read My Mind',tier:1,ground:'#C81932',available:true,cover:'/images/read-my-mind-cover.png'},
 {id:'dare-me',number:'02',title:'Dare Me',tier:3,ground:'#3A3A3A',available:false,cover:'/images/dare-me-cover.png'},
 {id:'no-secrets',number:'03',title:'No Secrets',tier:2,ground:'#692345',available:false,cover:'/images/no-secrets-cover.png'},
 {id:'take-control',number:'04',title:'Take Control',tier:3,ground:'#5C1A2B',available:false,cover:'/images/take-control-cover.png'},
 {id:'lucky-tonight',number:'05',title:'Lucky Tonight',tier:2,ground:'#B0205F',available:false,cover:'/images/lucky-night-cover.png'},
];
export const findGame=(id:string)=>games.find(g=>g.id===id);

/** The catalog in the viewer's language. */
export function useGames():GameInfo[]{
 const t=useTranslations('catalog');
 return useMemo(()=>games.map(g=>({...g,tagline:t(`items.${g.id}.tagline`),description:t(`items.${g.id}.description`),duration:t(`items.${g.id}.duration`),tierLabel:t(`tiers.${g.tier}`),
  rules:t.raw(`items.${g.id}.rules`) as string[],types:t.raw(`items.${g.id}.types`) as string[],sample:t.raw(`items.${g.id}.sample`) as GameInfo['sample']})),[t]);
}

/** Heat names and mood hints (1 Sweet → 5 Wild) in the viewer's language. */
export function useHeat(){
 const t=useTranslations('heat');
 return useMemo(()=>{const labels=t.raw('labels') as string[],hints=t.raw('hints') as string[];const at=(list:string[],level:number)=>list[Math.min(5,Math.max(1,level))-1];
  return {label:(level:number)=>at(labels,level),hint:(level:number)=>at(hints,level),labels}},[t]);
}
