'use client';
import {useUI} from '@/store/use-ui';
// Tiny synthesized cues, so there are no audio assets to load. Silent when sound is off or audio is unavailable.
type Cue='flip'|'press'|'reveal'|'reward';
const NOTES:Record<Cue,Array<[number,number]>>={flip:[[520,.05]],press:[[180,.06]],reveal:[[440,.08],[660,.1]],reward:[[523,.08],[659,.08],[784,.14]]};
let ctx:AudioContext|null=null;
export function playCue(cue:Cue){
 if(!useUI.getState().sound||typeof window==='undefined')return;
 try{ctx??=new (window.AudioContext||(window as any).webkitAudioContext)();let t=ctx.currentTime;
  for(const [freq,dur] of NOTES[cue]){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=cue==='press'?'square':'triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.08,t);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+dur);t+=dur*.9}
 }catch{}
}
