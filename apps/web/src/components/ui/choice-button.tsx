'use client';
import type {ButtonHTMLAttributes,ReactNode} from 'react';

/**
 * An answer surface (A/B/C, Yes/Maybe/No). Radio semantics.
 * `selected` is the player's local pick, shown as an outline; `state="locked"` means the server accepted it (solid);
 * `state="crossed"` marks an eliminated answer.
 */
export function ChoiceButton({selected=false,state,keyLabel,tag,tile=false,children,className='',type='button',...rest}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'>&{selected?:boolean;state?:'locked'|'crossed';keyLabel?:string;tag?:ReactNode;tile?:boolean;children:ReactNode}){
 return <button type={type} role="radio" aria-checked={selected||state==='locked'} data-state={state} className={['choice',tile&&'choice-tile',className].filter(Boolean).join(' ')} {...rest}>
  {keyLabel&&<span aria-hidden className="choice-key">{keyLabel}</span>}
  <span className="min-w-0 flex-1">{children}</span>
  {tag&&<span className="choice-tag">{tag}</span>}
 </button>;
}
