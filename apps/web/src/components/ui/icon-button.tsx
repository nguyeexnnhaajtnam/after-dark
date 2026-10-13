'use client';
import {forwardRef,type ButtonHTMLAttributes,type ReactNode} from 'react';

/** Icon-only control. `label` is required: it becomes the accessible name and the hover tooltip. */
export const IconButton=forwardRef<HTMLButtonElement,Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'aria-label'>&{label:string;children:ReactNode;shape?:'square'|'round';size?:'sm'|'md';surface?:'dark'|'light'}>(
 function IconButton({label,children,shape='square',size='md',surface='dark',className='',type='button',title,...rest},ref){
  return <button ref={ref} type={type} aria-label={label} title={title??label} className={['icon-btn',size==='sm'&&'icon-btn-sm',shape==='round'&&'round',surface==='light'&&'on-light',className].filter(Boolean).join(' ')} {...rest}>{children}</button>;
 });
