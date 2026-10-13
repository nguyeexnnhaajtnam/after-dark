import type { Metadata,Viewport } from 'next';import {cookies} from 'next/headers';import './globals.css';
import {DEFAULT_LOCALE,HTML_LANG,isLocale,LOCALE_COOKIE,MESSAGES} from '@/i18n/config';
import {LocaleProvider} from '@/i18n/locale-provider';
// Font faces live in globals.css (one family per typeface, subsets split by unicode-range). These hints fetch the faces the
// first screen needs straight away; Vietnamese pages also preload the Vietnamese subsets.
const PRELOAD={latin:['anton-400-latin','bevietnampro-400-latin','bevietnampro-700-latin'],vi:['anton-400-vietnamese','bevietnampro-400-vietnamese','bevietnampro-700-vietnamese']};

async function currentLocale(){const value=(await cookies()).get(LOCALE_COOKIE)?.value;return isLocale(value)?value:DEFAULT_LOCALE}
export async function generateMetadata():Promise<Metadata>{const {meta}=MESSAGES[await currentLocale()];return {title:meta.title,description:meta.description}}
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#151515'};
export default async function Layout({children}:{children:React.ReactNode}){
 const locale=await currentLocale();const fonts=[...PRELOAD.latin,...(locale==='vi'?PRELOAD.vi:[])];
 return <html lang={HTML_LANG[locale]}>
  <head>{fonts.map(f=><link key={f} rel="preload" href={`/fonts/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous"/>)}</head>
  <body><LocaleProvider initial={locale}>{children}</LocaleProvider></body>
 </html>;
}
