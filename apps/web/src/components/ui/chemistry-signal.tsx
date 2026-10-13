export type SignalState='live'|'idle'|'lost';

/**
 * Presence as a "chemistry signal": four rising bars instead of a status dot. Live bars glow crimson-to-pink and breathe
 * now and then; idle (away) keeps one bar lit; lost (reconnecting) chases. Pass `label` to name it, and `announce` to make it a live status.
 */
export function ChemistrySignal({state,label,announce=false,className=''}:{state:SignalState;label?:string;announce?:boolean;className?:string}){
 return <span className={`signal ${className}`} data-state={state} {...(label?{role:announce?'status':'img','aria-label':label}:{'aria-hidden':true})}>
  {[0,1,2,3].map(i=><span key={i} className="signal-bar" style={{['--i' as string]:i}}/>)}
 </span>;
}
