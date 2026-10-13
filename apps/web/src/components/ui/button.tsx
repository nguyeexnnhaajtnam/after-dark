'use client';
import Link from 'next/link';
import {forwardRef,type ButtonHTMLAttributes,type ComponentProps,type ReactNode} from 'react';

export type ButtonVariant='primary'|'secondary'|'ghost'|'danger'|'utility'|'marquee';
export type ButtonSize='sm'|'md'|'lg';
type Look={variant?:ButtonVariant;size?:ButtonSize;/** Use on ivory sheets and cards. */surface?:'dark'|'light';block?:boolean;className?:string};
type Content={icon?:ReactNode;iconAfter?:ReactNode;children:ReactNode};

/** The single source of CTA classes; tokens and states live in globals.css under "CTA system". */
export function ctaClass({variant='primary',size='md',surface='dark',block=false,className=''}:Look){
 return ['cta',`cta-${variant}`,`cta-${size}`,surface==='light'&&'on-light',block&&'w-full',className].filter(Boolean).join(' ');
}

function Inner({icon,iconAfter,children,loading,loadingLabel}:Content&{loading?:boolean;loadingLabel?:ReactNode}){
 if(loading)return <><span aria-hidden className="cta-spinner"/><span className="cta-label">{loadingLabel??children}</span></>;
 return <>{icon}<span className="cta-label">{children}</span>{iconAfter}</>;
}

export type ButtonProps=Look&Content&Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'>&{
 /** Keeps the button's size, blocks repeat taps, and shows `loadingLabel` while the action is in flight. */
 loading?:boolean;loadingLabel?:ReactNode;
 /** Only set after the underlying action has actually succeeded. */
 success?:boolean;
};

export const Button=forwardRef<HTMLButtonElement,ButtonProps>(function Button({variant,size,surface,block,className,icon,iconAfter,children,loading,loadingLabel,success,disabled,type='button',...rest},ref){
 return <button ref={ref} type={type} disabled={disabled||loading} aria-busy={loading||undefined} data-loading={loading||undefined} data-success={success||undefined} className={ctaClass({variant,size,surface,block,className})} {...rest}>
  <Inner icon={icon} iconAfter={iconAfter} loading={loading} loadingLabel={loadingLabel}>{children}</Inner>
 </button>;
});

/** Navigation styled as a CTA. */
export function ButtonLink({variant,size,surface,block,className,icon,iconAfter,children,...rest}:Look&Content&Omit<ComponentProps<typeof Link>,'children'|'className'>){
 return <Link className={ctaClass({variant,size,surface,block,className})} {...rest}><Inner icon={icon} iconAfter={iconAfter}>{children}</Inner></Link>;
}
