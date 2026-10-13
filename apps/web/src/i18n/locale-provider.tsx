'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {NextIntlClientProvider,type AbstractIntlMessages} from 'next-intl';
import {HTML_LANG,isLocale,LOCALE_COOKIE,LOCALE_STORAGE,MESSAGES,type Locale} from './config';

type LocaleContext={locale:Locale;setLocale:(locale:Locale)=>void};
const Context=createContext<LocaleContext|null>(null);

function persist(locale:Locale){
 try{localStorage.setItem(LOCALE_STORAGE,locale)}catch{}
 document.cookie=`${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** Resolves a dotted key in the English catalog, so a key missing from another locale still shows real copy. */
function englishFallback(namespace:string|undefined,key:string){
 const value=[...(namespace?namespace.split('.'):[]),...key.split('.')].reduce<unknown>((node,part)=>node&&typeof node==='object'?(node as Record<string,unknown>)[part]:undefined,MESSAGES.en);
 return typeof value==='string'?value:key;
}

/**
 * Switching language swaps the message catalog in place: no navigation, no reload, so the socket, the room and any
 * in-progress choice survive. Each device keeps its own language; nothing here reaches the partner.
 */
export function LocaleProvider({initial,children}:{initial:Locale;children:ReactNode}){
 const [locale,setState]=useState<Locale>(initial);
 // A cleared cookie falls back to the stored preference.
 useEffect(()=>{try{const stored=localStorage.getItem(LOCALE_STORAGE);if(isLocale(stored)&&stored!==initial){setState(stored);persist(stored)}}catch{}},[initial]);
 useEffect(()=>{document.documentElement.lang=HTML_LANG[locale]},[locale]);
 const setLocale=useCallback((next:Locale)=>{setState(next);persist(next)},[]);
 const value=useMemo(()=>({locale,setLocale}),[locale,setLocale]);
 return <Context.Provider value={value}>
  <NextIntlClientProvider locale={locale} messages={MESSAGES[locale] as unknown as AbstractIntlMessages} timeZone="Asia/Ho_Chi_Minh"
   onError={error=>{if(process.env.NODE_ENV!=='production')console.warn(error.message)}}
   getMessageFallback={({namespace,key})=>englishFallback(namespace,key)}>
   {children}
  </NextIntlClientProvider>
 </Context.Provider>;
}

export function useLocaleSwitch(){
 const value=useContext(Context);
 if(!value)throw new Error('useLocaleSwitch must be used inside LocaleProvider');
 return value;
}
