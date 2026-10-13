'use client';import {useTranslations} from 'next-intl';import {useUI} from '@/store/use-ui';import {Button} from './ui/button';
export function AgeGate(){const {ageConfirmed,confirmAge,hydrated}=useUI();const t=useTranslations('age');if(!hydrated||ageConfirmed)return null;
 return <div role="dialog" aria-modal="true" aria-labelledby="age-title" className="fixed inset-0 z-50 grid place-items-center bg-obsidian p-6">
  <div aria-hidden className="absolute left-1/2 top-1/2 aspect-square w-[min(120vw,80svh)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plum"/>
  <div className="pop-in relative max-w-sm text-center"><div className="display mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-crimson text-4xl">18+</div><h2 id="age-title" className="display text-5xl">{t('title')}</h2><p className="mx-auto my-6 text-sm leading-6 text-ivory/85">{t('body')}</p><Button variant="primary" size="lg" onClick={confirmAge}>{t('confirm')}</Button><p className="mt-5 text-xs text-ivory/60">{t('footer')}</p></div>
 </div>}
