import {expect,type Browser,type BrowserContextOptions,type Page} from '@playwright/test';
import {IntlMessageFormat} from 'intl-messageformat';
import en from '../messages/en.json';
import vi from '../messages/vi.json';

// Specs read their expectations from the real catalogs, so a copy change never breaks a test and every assertion
// proves the screen shows the catalog text for that player's language.
export type Locale='vi'|'en';
export type Messages=typeof en;
export const MESSAGES:Record<Locale,Messages>={en,vi:vi as Messages};
export const LOCALE_COOKIE='after-dark-locale';
const BASE=process.env.E2E_BASE_URL||'http://127.0.0.1:3000';
/** Locales to run locale-parameterised specs in, e.g. E2E_LOCALES=vi. */
export const RUN_LOCALES=(process.env.E2E_LOCALES||'vi,en').split(',').filter((l):l is Locale=>l==='vi'||l==='en');

export const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Exact, anchored pattern for one of several labels. */
export const oneOf=(...labels:string[])=>new RegExp(`^(${labels.map(escape).join('|')})$`);

export type Copy={locale:Locale;m:Messages;f:(message:string,values?:Record<string,unknown>)=>string;
 /** The fixed text before the first placeholder, for labels that carry a number. */prefix:(message:string)=>string;
 /** The fixed text after the last placeholder. */suffix:(message:string)=>string};
export function copy(locale:Locale):Copy{
 const f=(message:string,values:Record<string,unknown>={})=>String(new IntlMessageFormat(message,locale).format(values as never));
 return {locale,m:MESSAGES[locale],f,prefix:m=>m.split('{')[0],suffix:m=>m.slice(m.lastIndexOf('}')+1)};
}

/** A browser context whose player has already chosen `locale` (null = a first-time visitor with no preference). */
export async function localeContext(browser:Browser,locale:Locale|null,options:BrowserContextOptions={}){
 const context=await browser.newContext(options);
 if(locale)await context.addCookies([{name:LOCALE_COOKIE,value:locale,url:BASE}]);
 return context;
}

/** Creates a room as the host and seats the guest, each in their own language. */
export async function seatPlayers(browser:Browser,{host:hostLocale,guest:guestLocale,viewport,guestName='Midnight',hostOptions={},reducedMotion}:{host:Locale;guest:Locale;viewport?:{width:number;height:number};guestName?:string;hostOptions?:BrowserContextOptions;reducedMotion?:'reduce'|'no-preference'}){
 const H=copy(hostLocale),G=copy(guestLocale);
 const hc=await localeContext(browser,hostLocale,{...(viewport?{viewport}:{}),...(reducedMotion?{reducedMotion}:{}),...hostOptions}),gc=await localeContext(browser,guestLocale,viewport?{viewport}:{});
 const host=await hc.newPage(),guest=await gc.newPage();
 await host.goto('/room/create');await host.getByPlaceholder(H.m.room.nicknamePlaceholder).fill('Scarlet');await host.getByRole('button',{name:H.m.room.create.action}).click();
 const code=(await host.getByTestId('room-code').innerText()).trim();
 await guest.goto(`/room/join?code=${code}`);await guest.getByPlaceholder(G.m.room.nicknamePlaceholder).fill(guestName);await guest.getByRole('button',{name:G.m.room.join.action}).click();
 await host.getByText(H.m.lobby.partnerJoined).waitFor();
 return {host,guest,H,G,code,hc,gc,close:async()=>{await hc.close();await gc.close()}};
}

/** Starts the game from the lobby and skips the briefing on both phones. */
/**
 * Draws from the sheet that opens on its own (a Secret Mission or a Power Card): tap a face-down card once the shuffle has
 * spread them, wait for it to turn over, then keep it. Returns the revealed card's text.
 */
export async function drawFromSheet(p:Page,c:Copy,kind:'mission'|'power'){
 const sheet=p.getByRole('dialog');await expect(sheet.getByText(c.m.draw[kind].title)).toBeVisible();
 await sheet.locator('.draw-card').first().click();
 const front=sheet.locator('.draw-reveal-front');await expect(front).toBeVisible();const text=(await front.innerText()).trim();
 await sheet.getByRole('button',{name:c.m.draw[kind].keep}).click();await expect(sheet).toBeHidden();return text;
}
export async function dealIn({host,guest,H,G}:{host:Page;guest:Page;H:Copy;G:Copy}){
 await guest.getByRole('button',{name:G.m.lobby.imIn}).click();await host.getByRole('button',{name:H.m.lobby.start}).click();
 for(const [p,c] of [[host,H],[guest,G]] as const){await p.getByRole('button',{name:c.m.onboarding.skip}).click();await p.getByRole('button',{name:c.m.onboarding.deal}).click()}
 await host.locator('article[data-card-type]').waitFor();
 // Each player draws their first Secret Mission from their own deck.
 for(const [p,c] of [[host,H],[guest,G]] as const)await drawFromSheet(p,c,'mission');
}
