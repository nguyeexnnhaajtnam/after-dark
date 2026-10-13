'use client';import {create} from 'zustand';
type UI={ageConfirmed:boolean;sound:boolean;hydrated:boolean;hydrate:()=>void;confirmAge:()=>void;toggleSound:()=>void};
const read=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{}};
export const useUI=create<UI>(set=>({ageConfirmed:false,sound:true,hydrated:false,
 hydrate:()=>set({ageConfirmed:read('after-dark:age')==='yes',sound:read('after-dark:sound')!=='off',hydrated:true}),
 confirmAge:()=>{write('after-dark:age','yes');set({ageConfirmed:true})},
 toggleSound:()=>set(s=>{write('after-dark:sound',s.sound?'off':'on');return {sound:!s.sound}})}));
