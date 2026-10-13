'use client';
import type {ReactNode} from 'react';
import {Button} from './button';

export type ActionSpec={label:string;run:()=>void;disabled?:boolean;loadingLabel?:string;icon?:ReactNode;attention?:boolean};

/** Waiting is information, not an action, so it never renders as a button. */
export function WaitStatus({children}:{children:ReactNode}){
 return <p role="status" aria-live="polite" className="wait-status"><span aria-hidden className="wait-spinner"/><span>{children}</span></p>;
}

/**
 * Fixed bottom action area for full-height screens. It sits in the layout flow (never over content) and pads for the safe area.
 * One primary at most; the secondary is a quiet ghost. Below 360px the primary stacks on top at full width.
 * `pending` names the action in flight: it shows the loading state, and both actions are blocked until the server answers.
 */
export function ActionBar({primary,secondary,waiting,note,pending=null,className=''}:{primary?:ActionSpec;secondary?:ActionSpec;waiting?:string;note?:ReactNode;pending?:'primary'|'secondary'|null;className?:string}){
 const busy=pending!==null;
 return <footer className={`flex-none border-t-2 border-ivory/10 bg-obsidian px-3 pb-[max(.75rem,var(--safe-bottom))] pt-2.5 ${className}`}>
  <div className="mx-auto max-w-lg">
   {note&&<p role="status" aria-live="polite" className="mb-2 text-center text-[13px] leading-5 text-ivory/80">{note}</p>}
   {waiting&&<WaitStatus>{waiting}</WaitStatus>}
   {(primary||secondary)&&<div className="flex flex-col-reverse gap-1 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-2.5">
    {secondary&&<Button variant="ghost" size="md" onClick={secondary.run} disabled={secondary.disabled||(busy&&pending!=='secondary')} loading={pending==='secondary'} loadingLabel={secondary.loadingLabel} icon={secondary.icon} className={primary?'min-[360px]:shrink-0':'w-full'}>{secondary.label}</Button>}
    {primary&&<Button variant="primary" size="lg" onClick={primary.run} disabled={primary.disabled||(busy&&pending!=='primary')} loading={pending==='primary'} loadingLabel={primary.loadingLabel} icon={primary.icon} className={`w-full min-[360px]:flex-1 ${primary.attention?'fx-cta-attention':''}`}>{primary.label}</Button>}
   </div>}
  </div>
 </footer>;
}
