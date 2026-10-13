import type {Locale} from '@after-dark/contracts';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

export type {Locale};
export const LOCALES:readonly Locale[]=['vi','en'];
/** New visitors see Vietnamese; English is one tap away. */
export const DEFAULT_LOCALE:Locale='vi';
/** Read by the server layout so the first paint is already in the chosen language. Not prefixed with `after-dark:`, which lib/api scans for room credentials. */
export const LOCALE_COOKIE='after-dark-locale';
export const LOCALE_STORAGE='after-dark-locale';
export const isLocale=(value:unknown):value is Locale=>value==='vi'||value==='en';
export const MESSAGES={en,vi} as const;
export const HTML_LANG:Record<Locale,string>={vi:'vi-VN',en:'en-US'};
export type Messages=typeof en;
