import {useTranslations} from 'next-intl';
import type {Messages} from '@/i18n/config';
// Small copy pools in messages/<locale>.json. The server sends one `variant` per round, so both phones show the
// line at the same position, each in its own language.
export type CopyPool=keyof Messages['pools'];
export function usePool(){
 const t=useTranslations('pools');
 return (pool:CopyPool,variant=0)=>{const lines=t.raw(pool) as string[];return lines[Math.abs(variant)%lines.length]};
}
export const titleLength=(text:string)=>text.length>90?'xlong':text.length>55?'long':'short';
