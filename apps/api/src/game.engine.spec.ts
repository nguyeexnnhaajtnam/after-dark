import {chemistryDeadline,chemistryTiming,cleanText,drawerFor,GameEngine,isOutdated,localizeCard,normalize,POWER_KINDS,RULESET,toLocale,twistEffect,TWISTS,type InternalState} from './game.engine';

const zero=()=>({correctReads:0,reads:0,extraReads:0,extraCorrectReads:0,reciprocalReads:0,reciprocalCorrectReads:0,assistedReads:0,assistedCorrectReads:0,chemistryCompleted:0,missionsCompleted:0});
const state=(over:Partial<InternalState>={}):InternalState=>({ruleset:RULESET,phase:'WAITING_FOR_SECRET',round:1,version:1,seed:0,heat:3,players:['a','b'],cardIds:['mind'],forfeitIds:['f1','f2'],wrongGuesses:0,
 secretPlayerId:'a',guessingPlayerId:'b',normalSecretPlayerId:'a',scores:{a:0,b:0},stats:{a:zero(),b:zero()},
 missions:{a:[{cardId:'ma',status:'ACTIVE',notYet:0},{cardId:'ma2',status:'ACTIVE',notYet:0}],b:[{cardId:'mb',status:'ACTIVE',notYet:0}]},
 inventory:{a:[],b:[]},rewards:{},howToPlayAcks:{},votes:{},chemDone:{},chemReady:{},chemDoneAt:{},desires:{},twistAcks:{},
 counter:{},followUpAskers:{},bonusCardIds:[],forfeitQueue:[],predictions:[],...over});
const action=(type:string,extra={})=>({actionId:crypto.randomUUID(),expectedVersion:1,type,...extra} as any);
const engine=new GameEngine({} as any) as any;
const secret=(s:InternalState,choice:number)=>engine.mindReader(s,s.secretPlayerId,action('SUBMIT_SECRET',{choice}));
const guess=(s:InternalState,choice:number)=>engine.mindReader(s,s.guessingPlayerId,action('SUBMIT_GUESS',{choice}));
const counter=(s:InternalState,p:string,choice:number,prediction:number)=>engine.mindReader(s,p,action('SUBMIT_COUNTER_MIND',{choice,prediction}));
const mr=(s:InternalState,p:string,type:string,extra={})=>engine.mindReader(s,p,action(type,extra));
/** Off-deck Mind Reader questions, as the database would return them for a Double Challenge part B or a Picky Kitty draw. */
const offDeck=[{id:'x1',intensity:1},{id:'x2',intensity:2},{id:'x3',intensity:3}];
/** Drives NEXT_ROUND against an in-memory deck (card id → type) and question pool. */
const next=(s:InternalState,deck:Record<string,string>,questions=offDeck)=>engine.nextRound({gameCard:{findUniqueOrThrow:async({where}:any)=>({id:where.id,type:deck[where.id]}),findMany:async()=>questions}},s,deck[s.cardIds[s.round-1]]);
/** The payer draws the forfeit from the face-down spread. */
const drawForfeit=(s:InternalState,choice=0)=>engine.drawCard(s,s.forfeit!.payerId,'FORFEIT',choice);
const ackTwist=(s:InternalState,effect:string)=>{engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),effect);engine.plotTwist(s,'b',action('PLOT_TWIST_ACK'),effect)};
/** Heat-tagged candidates, as the database would return them for a Power Card draw. */
const pool=(prefix:string,heats:number[])=>heats.map((intensity,i)=>({id:`${prefix}${i}`,intensity}));
const projectionDb=(s:InternalState)=>({room:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'r',code:'ABC123',status:'PLAYING',selectedGame:'read-my-mind',expiresAt:new Date(),players:[{id:'a',nickname:'A',isHost:true,connected:true,ready:true,maxHeat:4},{id:'b',nickname:'B',isHost:false,connected:true,ready:true,maxHeat:3}],sessions:[{id:'session',state:JSON.parse(JSON.stringify(s))}]})},gameCard:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'mind',type:'MIND_READER',question:'Question?',choices:['One','Two','Three'],intensity:2,artworkPath:'/card.png',challenge:null}),findMany:jest.fn().mockResolvedValue([])}});
const snapshot=(s:InternalState)=>JSON.parse(JSON.stringify({scores:s.scores,stats:s.stats,result:s.result,predictions:s.predictions}));

describe('How to Play briefing',()=>{
 it('starts the first round only after both players acknowledge',()=>{const s=state({phase:'HOW_TO_PLAY'});engine.ackHowToPlay(s,'a','MIND_READER');expect(s.phase).toBe('HOW_TO_PLAY');engine.ackHowToPlay(s,'b','MIND_READER');expect(s.phase).toBe('WAITING_FOR_SECRET');expect(s.secretPlayerId).toBe('a')});
});

describe('Mind Reader Sparks and forfeits',()=>{
 it('awards one Spark and a correct-read stat for a right guess, with no forfeit',()=>{const s=state();secret(s,1);expect(s.phase).toBe('WAITING_FOR_GUESS');guess(s,1);expect(s.result).toEqual(expect.objectContaining({correct:true,sparksEarned:1}));expect(s.scores.b).toBe(1);expect(s.stats.b).toEqual(expect.objectContaining({correctReads:1,reads:1,extraReads:0,assistedReads:0}));expect(s.forfeit).toBeUndefined();
  expect(s.predictions).toEqual([expect.objectContaining({round:1,holderId:'a',guesserId:'b',secretChoice:1,guessChoice:1,correct:true,category:'NORMAL',questionId:'mind',cardId:'mind'})])});
 it('earns nothing on a wrong guess and offers an optional forfeit to the guesser',()=>{const s=state();secret(s,0);guess(s,2);expect(s.scores.b).toBe(0);expect(s.result?.correct).toBe(false);expect(s.forfeit).toEqual({payerId:'b',stage:'DRAWING',votes:{}});drawForfeit(s,1);expect(s.forfeit).toEqual(expect.objectContaining({payerId:'b',stage:'OFFERED'}));expect(['f1','f2']).toContain(s.forfeit?.cardId)});
 it('lets either player pass the forfeit, and accepts only when both say yes',()=>{const s=state();secret(s,0);guess(s,2);drawForfeit(s);engine.forfeitVote(s,'b',true);expect(s.forfeit?.stage).toBe('OFFERED');engine.forfeitVote(s,'a',true);expect(s.forfeit?.stage).toBe('ACCEPTED');const t=state();secret(t,0);guess(t,2);drawForfeit(t);engine.forfeitVote(t,'a',false);expect(t.forfeit?.stage).toBe('PASSED');expect(t.scores).toEqual({a:0,b:0})});
 it('rejects a duplicate forfeit vote',()=>{const s=state();secret(s,0);guess(s,2);drawForfeit(s);engine.forfeitVote(s,'b',true);expect(()=>engine.forfeitVote(s,'b',true)).toThrow('already answered')});
 it('rejects actions from the wrong player',()=>{const s=state();expect(()=>engine.mindReader(s,'b',action('SUBMIT_SECRET',{choice:0}))).toThrow('Not your turn');secret(s,0);expect(()=>engine.mindReader(s,'a',action('SUBMIT_GUESS',{choice:0}))).toThrow('Not your turn')});
 it('uses deterministic copy variants shared by both players',()=>{const s=state({seed:40,round:3});secret(s,0);guess(s,0);expect(s.result?.variant).toBe((40+3*31)%1000)});
});

describe('Drawing the next card',()=>{
 /** An in-memory database driving engine.action end to end: version check, action ids, the drawer's connection. */
 const db=(s:InternalState,deck:Record<string,string>,connected:Record<string,boolean>={a:true,b:true})=>{const seen=new Set<string>();let stored=JSON.parse(JSON.stringify(s));
  const tx={gameSession:{findFirst:async()=>({id:'session',state:JSON.parse(JSON.stringify(stored))}),update:async({data}:any)=>{stored=JSON.parse(JSON.stringify(data.state))}},
   sessionAction:{findUnique:async({where}:any)=>seen.has(where.sessionId_actionId.actionId)?{}:null,create:async({data}:any)=>{seen.add(data.actionId)}},
   gameCard:{findUniqueOrThrow:async({where}:any)=>({id:where.id,type:deck[where.id]}),findMany:async()=>offDeck},roomPlayer:{findUnique:async({where}:any)=>({id:where.id,connected:connected[where.id]})}};
  return {state:()=>stored as InternalState,engine:new GameEngine({$transaction:async(fn:any)=>fn(tx)} as any)}};
 const send=(d:ReturnType<typeof db>,p:string,type:string,extra={})=>d.engine.action('r',p,{actionId:crypto.randomUUID(),expectedVersion:d.state().version,round:d.state().round,type,...extra} as any);
 const deck={m1:'MIND_READER',c1:'CHEMISTRY',m2:'MIND_READER'};
 it('takes turns: the host draws card 1, the partner card 2, and so on',()=>{const s=state({phase:'HOW_TO_PLAY'});expect(engine.nextDrawer(s)).toBe('a');expect(drawerFor(s,1)).toBe('a');expect(drawerFor(s,2)).toBe('b');expect(drawerFor(s,3)).toBe('a');
  const r=state({phase:'ROUND_COMPLETE',round:3});expect(engine.nextDrawer(r)).toBe('b');expect(engine.nextDrawer(state({phase:'ROUND_COMPLETE',round:4}))).toBe('a')});
 it('says what NEXT_ROUND does from each resolved state, and nothing while a card still needs an answer',()=>{expect(engine.nextStep(state({phase:'HOW_TO_PLAY'}),'MIND_READER')).toBe('DRAW');expect(engine.nextStep(state(),'MIND_READER')).toBeUndefined();
  expect(engine.nextStep(state({phase:'ROUND_COMPLETE'}),'CHEMISTRY')).toBe('DRAW');expect(engine.nextStep(state({phase:'ROUND_COMPLETE',round:12}),'CHEMISTRY')).toBe('RESULTS');
  expect(engine.nextStep(state({phase:'REVEAL',activeTwist:'DOUBLE_CHALLENGE',challengePart:1}),'MIND_READER')).toBe('PART_B');expect(engine.nextStep(state({phase:'REVEAL',forfeitQueue:['b']}),'MIND_READER')).toBe('FORFEIT');
  expect(engine.nextStep(state({phase:'REVEAL',forfeit:{payerId:'b',votes:{},stage:'DRAWING'}}),'MIND_READER')).toBeUndefined();expect(engine.nextStep(state({phase:'REVEAL',forfeit:{payerId:'b',cardId:'f1',votes:{},stage:'OFFERED'}}),'MIND_READER')).toBeUndefined();
  expect(engine.nextStep(state({phase:'REVEAL',forfeit:{payerId:'b',cardId:'f1',votes:{a:false},stage:'PASSED'}}),'MIND_READER')).toBe('DRAW')});
 it('deals the first card straight from the briefing when its drawer draws; the partner never has to acknowledge',async()=>{const d=db(state({phase:'HOW_TO_PLAY',cardIds:['m1','c1','m2']}),deck);
  await expect(send(d,'b','NEXT_ROUND')).rejects.toThrow("your partner's turn to draw");expect(d.state().phase).toBe('HOW_TO_PLAY');
  await expect(send(d,'a','SUBMIT_SECRET',{choice:0})).rejects.toThrow('Finish the briefing');
  await send(d,'a','NEXT_ROUND');expect(d.state().phase).toBe('WAITING_FOR_SECRET');expect(d.state().round).toBe(1);expect(d.state().secretPlayerId).toBe('a')});
 it('still starts from two briefing acknowledgements, for clients that send them',()=>{const s=state({phase:'HOW_TO_PLAY'});engine.ackHowToPlay(s,'a','MIND_READER');engine.ackHowToPlay(s,'b','MIND_READER');expect(s.phase).toBe('WAITING_FOR_SECRET')});
 it('lets only the drawer deal the next card, once, and the partner only while the drawer is offline',async()=>{const d=db(state({phase:'ROUND_COMPLETE',cardIds:['m1','c1','m2']}),deck);
  await expect(send(d,'a','NEXT_ROUND')).rejects.toThrow("your partner's turn");const v=d.state().version;
  const id=crypto.randomUUID();await d.engine.action('r','b',{actionId:id,expectedVersion:v,round:1,type:'NEXT_ROUND'} as any);expect(d.state().round).toBe(2);expect(d.state().phase).toBe('CHEMISTRY_CONSENT');
  await expect(d.engine.action('r','b',{actionId:id,expectedVersion:v+1,round:2,type:'NEXT_ROUND'} as any)).rejects.toThrow('Duplicate');
  await expect(d.engine.action('r','b',{actionId:crypto.randomUUID(),expectedVersion:v,round:2,type:'NEXT_ROUND'} as any)).rejects.toThrow('Stale');expect(d.state().round).toBe(2);
  const away=db(state({phase:'ROUND_COMPLETE',cardIds:['m1','c1','m2']}),deck,{a:true,b:false});await send(away,'a','NEXT_ROUND');expect(away.state().round).toBe(2)});
 it('keeps steps inside one card open to either player, and the results to either player',async()=>{const p=db(state({phase:'REVEAL',cardIds:['m1','c1'],activeTwist:'DOUBLE_CHALLENGE',challengePart:1,secondCardId:'x2'}),deck);await send(p,'a','NEXT_ROUND');expect(p.state().challengePart).toBe(2);
  const end=db(state({phase:'ROUND_COMPLETE',round:12,cardIds:Array(12).fill('c1')}),deck);await send(end,'a','NEXT_ROUND');expect(end.state().phase).toBe('GAME_COMPLETE')});
 it('never deals past an open forfeit, whoever draws',async()=>{const s=state({cardIds:['m1','c1']});secret(s,0);guess(s,2);const f=db(s,deck);await expect(send(f,'b','NEXT_ROUND')).rejects.toThrow('forfeit');await expect(send(f,'a','NEXT_ROUND')).rejects.toThrow('forfeit')});
 it('projects the next step and who draws, to both phones alike',async()=>{const s=state({phase:'ROUND_COMPLETE'});const a=await new GameEngine(projectionDb(s) as any).project('r','a'),b=await new GameEngine(projectionDb(s) as any).project('r','b');
  expect(a.game?.nextStep).toBe('DRAW');expect(a.game?.nextDrawerId).toBe('b');expect(b.game?.nextDrawerId).toBe('b');const open=await new GameEngine(projectionDb(state()) as any).project('r','a');expect(open.game?.nextStep).toBeUndefined();expect(open.game?.nextDrawerId).toBeUndefined()});
});

describe('Chemistry lifecycle',()=>{
 it('starts once both choose to take part, needs completion from both, then pays one Spark each',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));expect(s.phase).toBe('CHEMISTRY_CONSENT');engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:true}));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer?.startedAt).toBeTruthy();expect(s.scores).toEqual({a:0,b:0});
  expect(()=>engine.chemistry(s,'a',action('CHEMISTRY_START'))).toThrow('not ready to start');engine.chemistry(s,'a',action('CHEMISTRY_DONE'));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores.a).toBe(0);
  engine.chemistry(s,'b',action('CHEMISTRY_DONE'));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1});expect(s.stats.a.chemistryCompleted).toBe(1)});
 it('ends without penalty when one player declines',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:false}));expect(s.phase).toBe('ROUND_COMPLETE');expect(s.result?.chemistry).toBe('DECLINED');expect(s.scores).toEqual({a:0,b:0})});
 it('never treats consent as completion, and can be stopped once running',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));expect(()=>engine.chemistry(s,'a',action('CHEMISTRY_DONE'))).toThrow('not in progress');engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:true}));expect(s.scores).toEqual({a:0,b:0});engine.chemistry(s,'b',action('CHEMISTRY_STOP'));expect(s.result?.chemistry).toBe('SKIPPED');expect(s.scores).toEqual({a:0,b:0})});
 it('rejects a repeated yes but always allows withdrawing consent',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));expect(()=>engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}))).toThrow('already answered');engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:false}));expect(s.result?.chemistry).toBe('DECLINED')});
 it('predicts the normal next chooser for Plot Twist copy',()=>{const s=state({phase:'PLOT_TWIST',lastMindSecretId:'a'});expect(engine.nextMindSecret(s,'PLOT_TWIST')).toBe('b');const r=state({phase:'REVEAL'});expect(engine.nextMindSecret(r,'MIND_READER')).toBe('b')});
});

describe('Chemistry countdown',()=>{
 const T0=new Date('2026-10-13T20:00:00.000Z'),at=(ms:number)=>new Date(T0.getTime()+ms);
 const vote=(s:InternalState,p:string,now=T0,seconds:number|null=60)=>engine.chemistry(s,p,action('CHEMISTRY_VOTE',{accept:true}),seconds,now);
 /** A session still parked at the older "both press start" step. */
 const legacy=()=>state({phase:'CHEMISTRY_ACCEPTED',votes:{a:true,b:true}});
 const start=(s:InternalState,p:string,now=T0,seconds:number|null=60)=>engine.chemistry(s,p,action('CHEMISTRY_START'),seconds,now);
 const done=(s:InternalState,p:string,now:Date)=>engine.chemistry(s,p,action('CHEMISTRY_DONE'),60,now);
 const running=()=>{const s=state({phase:'CHEMISTRY_CONSENT'});vote(s,'a');vote(s,'b',at(1500));return s};
 it('starts no clock on one yes, and offers no separate start step',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});expect(()=>start(s,'a')).toThrow('not ready to start');vote(s,'a');expect(s.phase).toBe('CHEMISTRY_CONSENT');expect(s.chemTimer).toBeUndefined();expect(chemistryTiming(s,'a',60,T0)).toEqual(expect.objectContaining({durationSeconds:60,timerExpired:false}));expect(chemistryTiming(s,'a',60,T0).endsAt).toBeUndefined()});
 it('lets a session parked at the older start step still start once both press start',()=>{const s=legacy();start(s,'a');expect(s.phase).toBe('CHEMISTRY_ACCEPTED');expect(s.chemTimer).toBeUndefined();expect(chemistryTiming(s,'a',60,T0).iReady).toBe(true);expect(chemistryTiming(s,'b',60,T0).iReady).toBe(false);expect(()=>start(s,'a',at(800))).toThrow('already pressed start');
  start(s,'b',at(1500));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer).toEqual({startedAt:at(1500).toISOString(),durationSeconds:60,endsAt:at(61500).toISOString()})});
 it('starts exactly one server-stamped countdown once both agree, with the deadline fixed from the second yes',()=>{const s=running();expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer).toEqual({startedAt:at(1500).toISOString(),durationSeconds:60,endsAt:at(61500).toISOString()})});
 it('never restarts or extends the clock: a late yes or start is rejected',()=>{const s=running();const timer={...s.chemTimer};expect(()=>vote(s,'a',at(30000))).toThrow('Consent is closed');expect(()=>vote(s,'b',at(30000))).toThrow('Consent is closed');expect(()=>start(s,'a',at(30000))).toThrow('not ready to start');expect(s.chemTimer).toEqual(timer);expect(chemistryTiming(s,'a',60,at(2000)).iReady).toBe(true)});
 it('gives both players the same deadline and a server clock reference, whenever they look',()=>{const s=running();const a=chemistryTiming(s,'a',60,at(20000)),b=chemistryTiming(s,'b',60,at(20000));expect(a.endsAt).toBe(b.endsAt);expect(a.startedAt).toBe(b.startedAt);expect(a.serverNow).toBe(at(20000).toISOString());
  // A client derives remaining = endsAt - (its clock + (serverNow - its clock at receipt)); any local clock skew cancels out.
  const remaining=(view:typeof a,clientNow:number,skew:number)=>Date.parse(view.endsAt!)-(clientNow+(Date.parse(view.serverNow)-(Date.parse(view.serverNow)+skew)));
  expect(remaining(a,at(20000).getTime()+90000,90000)).toBe(remaining(b,at(20000).getTime()-4000,-4000));expect(remaining(a,at(20000).getTime(),0)).toBe(41500)});
 it('completes before the deadline only when both confirm, paying exactly one Spark each',()=>{const s=running();done(s,'a',at(10000));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores).toEqual({a:0,b:0});expect(chemistryTiming(s,'a',60,at(10000)).iFinishedAt).toBe(at(10000).toISOString());expect(chemistryTiming(s,'b',60,at(10000)).iFinishedAt).toBeUndefined();expect(s.chemTimer?.endsAt).toBe(at(61500).toISOString());
  expect(()=>done(s,'a',at(11000))).toThrow('already confirmed');done(s,'b',at(12000));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1});expect(s.stats.a.chemistryCompleted).toBe(1);expect(()=>done(s,'b',at(13000))).toThrow('not in progress');expect(s.scores).toEqual({a:1,b:1})});
 it('stops for both, without penalty, before the deadline or after one confirmation',()=>{const s=running();engine.chemistry(s,'b',action('CHEMISTRY_STOP'),60,at(5000));expect(s.phase).toBe('ROUND_COMPLETE');expect(s.result?.chemistry).toBe('SKIPPED');expect(s.scores).toEqual({a:0,b:0});
  const t=running();done(t,'a',at(5000));engine.chemistry(t,'a',action('CHEMISTRY_STOP'),60,at(6000));expect(t.result?.chemistry).toBe('SKIPPED');expect(t.scores).toEqual({a:0,b:0});expect(()=>done(t,'b',at(7000))).toThrow('not in progress');
  const w=legacy();start(w,'a');engine.chemistry(w,'b',action('CHEMISTRY_STOP'));expect(w.result?.chemistry).toBe('SKIPPED')});
 it('expires on the deadline without paying or failing anything, and still accepts honest confirmations afterwards',()=>{const s=running();done(s,'a',at(30000));expect(chemistryTiming(s,'a',60,at(61499)).timerExpired).toBe(false);const late=chemistryTiming(s,'b',60,at(61500));expect(late.timerExpired).toBe(true);expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores).toEqual({a:0,b:0});expect(s.chemDone.a).toBe(true);
  done(s,'b',at(90000));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1})});
 it('keeps an untimed challenge on the same agree-then-confirm flow, with no deadline',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});vote(s,'a',T0,null);vote(s,'b',at(1000),null);expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer).toEqual({startedAt:at(1000).toISOString()});const v=chemistryTiming(s,'a',null,at(999999));expect(v.timerExpired).toBe(false);expect(v.endsAt).toBeUndefined();expect(chemistryDeadline(s)).toBeUndefined()});
 it('restores the same deadline from persisted state after a restart, and never re-arms a resolved challenge',()=>{const s=running();const restored=normalize(JSON.parse(JSON.stringify(s)));expect(restored.chemTimer).toEqual(s.chemTimer);expect(chemistryDeadline(restored)).toBe(at(61500).getTime());expect(chemistryTiming(restored,'b',60,at(70000)).timerExpired).toBe(true);
  const {chemReady:_r,chemDoneAt:_d,...stored}=JSON.parse(JSON.stringify(state({phase:'CHEMISTRY_ACCEPTED'})));const legacy=normalize(stored);expect(legacy.chemReady).toEqual({});expect(legacy.chemDoneAt).toEqual({});
  engine.chemistry(s,'a',action('CHEMISTRY_STOP'));expect(chemistryDeadline(s)).toBeUndefined()});
 it('projects real timer fields per viewer, unchanged across reconnects',async()=>{const s=running();done(s,'a',at(4000));const db={room:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'r',code:'ABC123',status:'PLAYING',selectedGame:'read-my-mind',expiresAt:new Date(),players:[{id:'a',nickname:'A',isHost:true,connected:true,ready:true,maxHeat:4},{id:'b',nickname:'B',isHost:false,connected:true,ready:true,maxHeat:3}],sessions:[{id:'session',state:JSON.parse(JSON.stringify(s))}]})},gameCard:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'chem-h4-2',type:'CHEMISTRY',question:'Statue',choices:['Agree','Decline'],intensity:4,artworkPath:'/x.png',challenge:'One minute',durationSeconds:60}),findMany:jest.fn().mockImplementation(({where})=>Promise.resolve(where.id.in.map((id:string)=>({id,question:`Text ${id}`}))))}};
  const first=await new GameEngine(db as any).project('r','a'),again=await new GameEngine(db as any).project('r','a'),partner=await new GameEngine(db as any).project('r','b');
  expect(first.game?.card.durationSeconds).toBe(60);expect(first.game?.chemistry).toEqual(expect.objectContaining({stage:'WAITING_FOR_COMPLETION',iReady:true,iFinished:true,startedAt:at(1500).toISOString(),endsAt:at(61500).toISOString(),durationSeconds:60,iFinishedAt:at(4000).toISOString()}));
  expect(again.game?.chemistry?.endsAt).toBe(first.game?.chemistry?.endsAt);expect(partner.game?.chemistry).toEqual(expect.objectContaining({stage:'IN_PROGRESS',partnerFinished:true,endsAt:at(61500).toISOString()}));expect(partner.game?.chemistry?.iFinishedAt).toBeUndefined()});
});

describe('Mutual Desire',()=>{
 it('keeps individual choices private unless both say yes',()=>{const s=state({phase:'MUTUAL_DESIRE_CHOICE'});engine.mutualDesire(s,'a',action('MUTUAL_DESIRE_CHOICE',{desire:'YES'}));engine.mutualDesire(s,'b',action('MUTUAL_DESIRE_CHOICE',{desire:'MAYBE'}));expect(s.result).toEqual({variant:expect.any(Number),mutualUnlocked:false})});
 it('does not let a sealed choice be changed',()=>{const s=state({phase:'MUTUAL_DESIRE_CHOICE'});engine.mutualDesire(s,'a',action('MUTUAL_DESIRE_CHOICE',{desire:'NO'}));expect(()=>engine.mutualDesire(s,'a',action('MUTUAL_DESIRE_CHOICE',{desire:'YES'}))).toThrow('already sealed')});
});

describe('Plot Twist lifecycle',()=>{
 const deck={m1:'MIND_READER',t1:'PLOT_TWIST',m2:'MIND_READER',m3:'MIND_READER',m4:'MIND_READER'};
 it('stores an activated twist as pending only after both players activate, and never awards Spark for it',()=>{const s=state({phase:'PLOT_TWIST'});engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),'ROLE_REVERSAL');expect(s.pendingTwist).toBeUndefined();engine.plotTwist(s,'b',action('PLOT_TWIST_ACK'),'ROLE_REVERSAL');
  expect(s.pendingTwist).toBe('ROLE_REVERSAL');expect(s.result).toEqual(expect.objectContaining({twistApplied:'ROLE_REVERSAL'}));expect(s.scores).toEqual({a:0,b:0});expect(s.phase).toBe('ROUND_COMPLETE')});
 it('Role Reversal swaps only its target Mind Reader card, then the normal schedule resumes',async()=>{const s=state({cardIds:['m1','t1','m2','m3']});
  secret(s,0);guess(s,0);await next(s,deck);expect(s.phase).toBe('PLOT_TWIST');ackTwist(s,'ROLE_REVERSAL');
  await next(s,deck);// normal alternation would make b hold the answer on m2
  expect(s.secretPlayerId).toBe('a');expect(s.guessingPlayerId).toBe('b');expect(s.twistNotice).toEqual({kind:'ROLE_REVERSAL',normalSecretPlayerId:'b',secretPlayerId:'a'});expect(s.pendingTwist).toBeUndefined();expect(s.activeTwist).toBe('ROLE_REVERSAL');
  secret(s,1);guess(s,1);expect(s.scores.b).toBe(2);await next(s,deck);
  // m3 is a's turn under the original schedule (a, b, a): the reversal did not shift the remaining turns.
  expect(s.secretPlayerId).toBe('a');expect(s.activeTwist).toBeUndefined();expect(s.twistNotice).toBeUndefined()});
 it('Double Challenge asks a second, different question in part B, chosen by the server off the 12-card deck',async()=>{const s=state({cardIds:['m1','m2'],pendingTwist:'DOUBLE_CHALLENGE'});engine.beginRound(s,'MIND_READER',engine.secondQuestion(s,[...offDeck,{id:'m2',intensity:1},{id:'hot',intensity:5}]));
  expect(s.challengePart).toBe(1);expect(offDeck.map(c=>c.id)).toContain(s.secondCardId);expect(engine.questionId(s)).toBe('m1');expect(s.cardIds).toEqual(['m1','m2']);
  secret(s,1);guess(s,1);expect(s.phase).toBe('REVEAL');expect(s.result).toEqual(expect.objectContaining({part:1,correct:true}));
  // A reconnect or restart between the parts reads the same second question.
  const restored=normalize(JSON.parse(JSON.stringify(s)));await next(restored,deck);
  expect(restored.round).toBe(1);expect(restored.challengePart).toBe(2);expect([restored.secretPlayerId,restored.guessingPlayerId]).toEqual(['b','a']);expect(engine.questionId(restored)).toBe(s.secondCardId);expect(restored.result).toBeUndefined();
  secret(restored,2);guess(restored,2);const [a,b]=restored.result!.predictions!;
  expect(a).toEqual(expect.objectContaining({guesserId:'b',questionId:'m1',category:'NORMAL'}));expect(b).toEqual(expect.objectContaining({guesserId:'a',questionId:s.secondCardId,category:'EXTRA'}));expect(a.questionId).not.toBe(b.questionId);
  expect(restored.predictions.map(p=>[p.cardId,p.part,p.twist])).toEqual([['m1',1,'DOUBLE_CHALLENGE'],['m1',2,'DOUBLE_CHALLENGE']]);
  // One Spark per right guess and no bonus for finishing both parts; part B is an extra read.
  expect(restored.scores).toEqual({a:1,b:1});expect(restored.stats.b).toEqual(expect.objectContaining({reads:1,correctReads:1,extraReads:0}));expect(restored.stats.a).toEqual(expect.objectContaining({reads:0,extraReads:1,extraCorrectReads:1}));
  await next(restored,deck);expect(restored.round).toBe(2);expect(restored.challengePart).toBeUndefined();expect(restored.secondCardId).toBeUndefined();expect(restored.activeTwist).toBeUndefined();expect(restored.secretPlayerId).toBe('b');expect(engine.questionId(restored)).toBe('m2')});
 it('Double Challenge never reuses or repeats a question: dealt, scheduled and already-used questions are excluded',()=>{const s=state({cardIds:['m1','m2','m3'],extraCardIds:['x0']});
  for(let i=0;i<20;i++)expect(engine.secondQuestion(s,[{id:'m1',intensity:1},{id:'m3',intensity:1},{id:'x0',intensity:1},{id:'x1',intensity:2}])).toBe('x1');
  expect(engine.secondQuestion(s,[{id:'m2',intensity:1},{id:'x0',intensity:1},{id:'hot',intensity:4}])).toBeUndefined()});
 it('Double Challenge without a second fresh question is skipped like a skipped twist: no penalty, a normal card, deck untouched',async()=>{const s=state({cardIds:['t1','m2','m3'],phase:'PLOT_TWIST'});ackTwist(s,'DOUBLE_CHALLENGE');
  await next(s,deck,[{id:'m2',intensity:1},{id:'hot',intensity:5}]);
  expect(s.twistSkipped).toBe('DOUBLE_CHALLENGE');expect(s.pendingTwist).toBeUndefined();expect(s.activeTwist).toBeUndefined();expect(s.challengePart).toBeUndefined();expect(s.phase).toBe('WAITING_FOR_SECRET');expect(s.cardIds).toEqual(['t1','m2','m3']);
  secret(s,0);guess(s,0);expect(s.result?.part).toBeUndefined();expect(s.scores).toEqual({a:0,b:1});await next(s,deck);expect(s.twistSkipped).toBeUndefined();expect(s.round).toBe(3)});
 it('Double Challenge settles a part A forfeit before part B begins',async()=>{const s=state({cardIds:['m1','m2'],pendingTwist:'DOUBLE_CHALLENGE'});engine.beginRound(s,'MIND_READER','x1');secret(s,0);guess(s,1);expect(s.forfeit?.payerId).toBe('b');
  await expect(next(s,deck)).rejects.toThrow('forfeit');engine.forfeitVote(s,'b',false);await next(s,deck);expect(s.challengePart).toBe(2);expect(s.forfeit).toBeUndefined()});
 it('Counter Mind seals both private answers and predictions, then reveals both together, symmetrically',()=>{const s=state({pendingTwist:'COUNTER_MIND'});engine.beginRound(s,'MIND_READER');expect(s.phase).toBe('COUNTER_MIND_SUBMIT');
  counter(s,'a',0,2);expect(s.phase).toBe('COUNTER_MIND_SUBMIT');expect(s.result).toBeUndefined();expect(s.predictions).toEqual([]);expect(()=>counter(s,'a',1,1)).toThrow('already sealed');expect(()=>secret(s,0)).toThrow('Not your turn');
  counter(s,'b',2,1);expect(s.phase).toBe('REVEAL');
  // Evaluated independently and alike: a predicted b's 2 (right), b predicted a's 1 but a chose 0 (wrong). Neither is "the" scheduled read.
  expect(s.result?.predictions).toEqual([expect.objectContaining({guesserId:'a',holderId:'b',secretChoice:2,guessChoice:2,correct:true,category:'RECIPROCAL'}),expect.objectContaining({guesserId:'b',holderId:'a',secretChoice:0,guessChoice:1,correct:false,category:'RECIPROCAL'})]);
  for(const p of ['a','b'])expect(s.stats[p]).toEqual(expect.objectContaining({reads:0,extraReads:0,reciprocalReads:1}));expect(s.stats.a.reciprocalCorrectReads).toBe(1);expect(s.stats.b.reciprocalCorrectReads).toBe(0);
  expect(s.scores).toEqual({a:1,b:0});expect(s.forfeit?.payerId).toBe('b')});
 it('Counter Mind offers a forfeit for each miss, one at a time',async()=>{const s=state({cardIds:['m1','m2'],pendingTwist:'COUNTER_MIND'});engine.beginRound(s,'MIND_READER');counter(s,'a',0,0);counter(s,'b',1,1);
  expect(s.forfeit?.payerId).toBe('a');engine.forfeitVote(s,'b',false);await next(s,deck);expect(s.round).toBe(1);expect(s.forfeit).toEqual(expect.objectContaining({payerId:'b',stage:'DRAWING'}));engine.forfeitVote(s,'a',false);await next(s,deck);expect(s.round).toBe(2)});
 it('Counter Mind survives a reconnect between the two submissions',()=>{const s=state({pendingTwist:'COUNTER_MIND'});engine.beginRound(s,'MIND_READER');counter(s,'b',1,0);const restored=normalize(JSON.parse(JSON.stringify(s)));
  expect(restored.counter).toEqual({b:{choice:1,prediction:0}});counter(restored,'a',0,1);expect(restored.phase).toBe('REVEAL');expect(restored.result?.predictions?.every(p=>p.correct)).toBe(true)});
 it('One More Question gives both players one Yes/No question before the guess, and an answered one marks the guess as hinted',()=>{const s=state({pendingTwist:'ONE_MORE_QUESTION'});engine.beginRound(s,'MIND_READER');secret(s,1);
  expect(s.phase).toBe('QUESTION_TIME');expect(s.questions).toEqual({a:{status:'OPEN'},b:{status:'OPEN'}});expect(()=>guess(s,1)).toThrow('Not your turn');
  expect(()=>mr(s,'b','ASK_QUESTION',{text:'   '})).toThrow('question first');expect(()=>mr(s,'a','ANSWER_QUESTION',{answer:'YES'})).toThrow('No question is waiting');
  mr(s,'b','ASK_QUESTION',{text:'  Is it\nthe sweet one? '});mr(s,'a','PASS_QUESTION');expect(s.phase).toBe('QUESTION_TIME');expect(()=>mr(s,'b','ASK_QUESTION',{text:'Again?'})).toThrow('already used');
  // A reconnect keeps the open exchange.
  const restored=normalize(JSON.parse(JSON.stringify(s)));expect(restored.questions?.b).toEqual({status:'ASKED',text:'Is it the sweet one?'});
  mr(restored,'a','ANSWER_QUESTION',{answer:'YES'});expect(restored.questions?.b).toEqual({status:'ANSWERED',text:'Is it the sweet one?',answer:'YES'});expect(restored.phase).toBe('WAITING_FOR_GUESS');expect(restored.scores).toEqual({a:0,b:0});
  guess(restored,1);expect(restored.result?.predictions?.[0]).toEqual(expect.objectContaining({category:'HINTED',correct:true}));expect(restored.stats.b).toEqual(expect.objectContaining({reads:0,correctReads:0,assistedReads:1,assistedCorrectReads:1}))});
 it('One More Question can be declined by either side and still moves on safely, without counting a refusal as anything',()=>{const s=state({pendingTwist:'ONE_MORE_QUESTION'});engine.beginRound(s,'MIND_READER');secret(s,0);
  mr(s,'a','ASK_QUESTION',{text:'Did you hesitate?'});mr(s,'b','ASK_QUESTION',{text:'Is it a bold one?'});mr(s,'a','ANSWER_QUESTION',{answer:'DECLINE'});mr(s,'b','ANSWER_QUESTION',{answer:'DECLINE'});
  expect(s.phase).toBe('WAITING_FOR_GUESS');guess(s,2);expect(s.result?.predictions?.[0].category).toBe('NORMAL');expect(s.stats.b).toEqual(expect.objectContaining({reads:1,assistedReads:0}));expect(s.stats.a).toEqual(zero());
  const t=state({pendingTwist:'ONE_MORE_QUESTION'});engine.beginRound(t,'MIND_READER');secret(t,0);mr(t,'a','PASS_QUESTION');mr(t,'b','PASS_QUESTION');expect(t.phase).toBe('WAITING_FOR_GUESS')});
 it('One More Question rejects a question or answer once the window has closed, without changing anything',()=>{const s=state({pendingTwist:'ONE_MORE_QUESTION'});engine.beginRound(s,'MIND_READER');
  expect(()=>mr(s,'b','ASK_QUESTION',{text:'Too early?'})).toThrow('closed');secret(s,0);mr(s,'a','PASS_QUESTION');mr(s,'b','PASS_QUESTION');guess(s,0);
  const before=JSON.stringify(s);expect(()=>mr(s,'a','ASK_QUESTION',{text:'Too late?'})).toThrow('closed');expect(()=>mr(s,'b','ANSWER_QUESTION',{answer:'NO'})).toThrow('closed');expect(JSON.stringify(s)).toBe(before)});
 it('consumes every twist exactly once, on its target card, even when that card is skipped',async()=>{for(const twist of TWISTS){const s=state({cardIds:['m1','m2','m3'],pendingTwist:twist as any});engine.beginRound(s,'MIND_READER','x1');expect(s.activeTwist).toBe(twist);expect(s.pendingTwist).toBeUndefined();
  engine.skip(s,'MIND_READER');await next(s,deck);expect(s.activeTwist).toBeUndefined();expect(s.twistNotice).toBeUndefined();expect(s.phase).toBe('WAITING_FOR_SECRET');expect(s.questions).toBeUndefined();expect(s.challengePart).toBeUndefined();expect(s.secondCardId).toBeUndefined()}});
 it('applies nothing when a twist is skipped, at no cost',async()=>{const s=state({phase:'PLOT_TWIST',cardIds:['t1','m2'],lastMindSecretId:'b'});engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),'COUNTER_MIND');engine.skip(s,'PLOT_TWIST');expect(s.pendingTwist).toBeUndefined();expect(s.result?.skipped).toBe(true);expect(s.scores).toEqual({a:0,b:0});
  await next(s,deck);expect(s.phase).toBe('WAITING_FOR_SECRET');expect(s.activeTwist).toBeUndefined();expect(s.secretPlayerId).toBe('a')});
 it('never stacks twists: a second one while one is pending does not apply',()=>{const s=state({phase:'PLOT_TWIST',pendingTwist:'COUNTER_MIND'});ackTwist(s,'ROLE_REVERSAL');expect(s.pendingTwist).toBe('COUNTER_MIND');expect(s.result?.twistAlreadyPending).toBe(true);
  engine.beginRound(s,'MIND_READER');expect(s.activeTwist).toBe('COUNTER_MIND');expect(s.secretPlayerId).toBe(s.normalSecretPlayerId)});
 it('keeps a pending twist through a reconnect or restart',async()=>{const s=state({phase:'PLOT_TWIST',cardIds:['t1','m2']});ackTwist(s,'DOUBLE_CHALLENGE');const restored=normalize(JSON.parse(JSON.stringify(s)));expect(restored.pendingTwist).toBe('DOUBLE_CHALLENGE');await next(restored,deck);expect(restored.challengePart).toBe(1);expect(restored.secondCardId).toBeDefined()});
 it('alternates Mind Reader roles by Mind Reader round, not by card',()=>{const s=state({lastMindSecretId:'a'});engine.beginRound(s,'MIND_READER');expect(s.secretPlayerId).toBe('b');expect(s.twistNotice).toBeUndefined()});
});

describe('every pair of Plot Twists, played through a full 12-card session',()=>{
 // A fixed, valid schedule: Mind Reader first, a Mind Reader after each twist and before the next, 5/3/2/2.
 const order=['m1','t1','m2','c1','t2','m3','d1','m4','c2','m5','c3','d2'];
 const deck:Record<string,string>=Object.fromEntries(order.map(id=>[id,{m:'MIND_READER',t:'PLOT_TWIST',c:'CHEMISTRY',d:'MUTUAL_DESIRE'}[id[0]]!]));
 const pairs=TWISTS.flatMap((x,i)=>TWISTS.slice(i+1).map(y=>[x,y] as const));
 it('covers exactly the six unordered pairs',()=>{expect(pairs).toHaveLength(6);expect(new Set(pairs.map(p=>p.join('+'))).size).toBe(6)});
 for(const [first,second] of pairs)it(`${first} + ${second}`,async()=>{
  const s=state({phase:'HOW_TO_PLAY',cardIds:[...order],twistEffects:{t1:first,t2:second}});
  expect(s.cardIds).toHaveLength(12);expect(deck[s.cardIds[0]]).toBe('MIND_READER');
  engine.ackHowToPlay(s,'a','MIND_READER');engine.ackHowToPlay(s,'b','MIND_READER');
  const cards:Array<{round:number;twist?:string;normal:string;questions:string[]}>=[];
  for(;;){const id=s.cardIds[s.round-1],type=deck[id];
   if(type==='MIND_READER'){const questions=new Set<string>();
    for(let step=0;step<20;step++){questions.add(engine.questionId(s));
     if(s.phase==='WAITING_FOR_SECRET')secret(s,0);
     else if(s.phase==='QUESTION_TIME'){for(const p of s.players)if(s.questions![p].status==='OPEN')mr(s,p,'PASS_QUESTION')}
     else if(s.phase==='WAITING_FOR_GUESS')guess(s,0);
     else if(s.phase==='COUNTER_MIND_SUBMIT'){counter(s,'a',0,0);counter(s,'b',0,0)}
     else if(s.phase==='REVEAL'&&s.challengePart===1)await next(s,deck);
     else break}
    expect(s.phase).toBe('REVEAL');cards.push({round:s.round,twist:s.activeTwist,normal:s.normalSecretPlayerId!,questions:[...questions]});
   }else if(type==='PLOT_TWIST'){ackTwist(s,engine.dealtTwist(s,id));expect(s.result?.twistAlreadyPending).toBeUndefined()}
   else engine.skip(s,type);
   const scores={...s.scores};await next(s,deck);if(type==='PLOT_TWIST')expect(s.scores).toEqual(scores);
   if(s.phase==='GAME_COMPLETE')break}
  // Each twist modified exactly its own next Mind Reader card, once; the rest played normally.
  expect(cards.map(c=>c.twist)).toEqual([undefined,first,second,undefined,undefined]);expect(s.pendingTwist).toBeUndefined();
  // The normal holder schedule never shifted, whatever the twists did to roles.
  expect(cards.map(c=>c.normal)).toEqual(['a','b','a','b','a']);
  for(const c of cards)expect(c.questions).toHaveLength(c.twist==='DOUBLE_CHALLENGE'?2:1);
  const total=(k:'reads'|'extraReads'|'reciprocalReads'|'assistedReads')=>s.stats.a[k]+s.stats.b[k];
  const has=(t:string)=>first===t||second===t;
  expect(total('reads')).toBe(has('COUNTER_MIND')?4:5);expect(total('extraReads')).toBe(has('DOUBLE_CHALLENGE')?1:0);expect(total('reciprocalReads')).toBe(has('COUNTER_MIND')?2:0);expect(total('assistedReads')).toBe(0);
  expect(s.predictions.every(p=>p.cardId&&p.questionId&&p.round>0)).toBe(true);expect(s.cardIds).toEqual(order);
 });
});

describe('Secret Missions and rewards',()=>{
 it('awards a Power Card only after partner confirmation, records the reward, and deals the next mission',()=>{const s=state();engine.declareMission(s,'a');expect(s.inventory.a).toHaveLength(0);engine.confirmMission(s,'b','a',true);expect(s.missions.a[0].status).toBe('COMPLETED');expect(s.inventory.a).toHaveLength(0);expect(engine.drawable(s,'a').POWER).toBe(3);engine.drawCard(s,'a','POWER',2);expect(s.inventory.a).toHaveLength(1);expect(POWER_KINDS).toContain(s.inventory.a[0].kind);expect(s.rewards.a).toEqual(expect.objectContaining({powerId:s.inventory.a[0].id,inventoryFull:false}));expect(s.stats.a.missionsCompleted).toBe(1);expect(s.missions.a[1].status).toBe('ACTIVE');expect(()=>engine.confirmMission(s,'b','a',true)).toThrow()});
 it('"Not yet" returns the mission without penalty and counts the attempt',()=>{const s=state();engine.declareMission(s,'a');engine.confirmMission(s,'b','a',false);expect(s.missions.a[0]).toEqual(expect.objectContaining({status:'ACTIVE',notYet:1}));expect(s.inventory.a).toHaveLength(0);expect(s.scores).toEqual({a:0,b:0})});
 it('only the partner can confirm',()=>{const s=state();engine.declareMission(s,'a');expect(()=>engine.confirmMission(s,'a','a',true)).toThrow('Only your partner')});
 it('respects the inventory limit of 2 and says so',()=>{const s=state({inventory:{a:[{id:'x',kind:'LET_ME_IN'},{id:'y',kind:'PICKY_KITTY'}],b:[]}});engine.declareMission(s,'a');engine.confirmMission(s,'b','a',true);expect(s.inventory.a).toHaveLength(2);expect(s.rewards.a.inventoryFull).toBe(true);expect(engine.drawable(s,'a').POWER).toBeUndefined()});
 it('spreads only the Power Cards its owner does not hold, and every kind can be drawn',()=>{const kinds=new Set<string>();for(let i=0;i<40;i++){const s=state({inventory:{a:[{id:'x',kind:'LET_ME_IN'}],b:[]}});engine.declareMission(s,'a');engine.confirmMission(s,'b','a',true);expect(engine.drawable(s,'a').POWER).toBe(2);engine.drawCard(s,'a','POWER',i%2);expect(s.inventory.a[1].kind).not.toBe('LET_ME_IN');kinds.add(s.inventory.a[1].kind)}expect([...kinds].sort()).toEqual(['A_LITTLE_PRESENT','PICKY_KITTY']);
  const u=state();engine.declareMission(u,'a');engine.confirmMission(u,'b','a',true);const all=new Set<string>();for(let i=0;i<60;i++){const c=JSON.parse(JSON.stringify(u));engine.drawCard(c,'a','POWER',i%3);all.add(c.inventory.a[0].kind)}expect([...all].sort()).toEqual([...POWER_KINDS].sort())});
});

describe('Drawing cards',()=>{
 /** A session dealt with drawn missions: each player holds a face-down deck and no mission yet. */
 const deck={m1:'MIND_READER',m2:'MIND_READER'};
 const fresh=(over:Partial<InternalState>={})=>state({missions:{a:[],b:[]},missionDeck:{a:['m1','m2','m3','m4','m5'],b:['n1']},powerDraws:{},forfeitUsed:[],forfeitIds:['f1','f2','f3','f4'],...over});
 it('lets each player draw their own mission from a spread of up to four face-down cards',()=>{const s=fresh();expect(engine.drawable(s,'a')).toEqual({MISSION:4});expect(engine.drawable(s,'b')).toEqual({MISSION:1});
  expect(()=>engine.drawCard(s,'a','MISSION',4)).toThrow('Pick one of the face-down cards');expect(()=>engine.drawCard(s,'a','MISSION',-1)).toThrow('face-down');
  engine.drawCard(s,'a','MISSION',3);const drawn=s.missions.a[0].cardId;expect(['m1','m2','m3','m4','m5']).toContain(drawn);expect(s.missions.a[0]).toEqual({cardId:drawn,status:'ACTIVE',notYet:0});expect(s.missionDeck!.a).toHaveLength(4);expect(s.missionDeck!.a).not.toContain(drawn);expect(s.missionDeck!.b).toEqual(['n1']);
  expect(engine.drawable(s,'a')).toEqual({});expect(()=>engine.drawCard(s,'a','MISSION',0)).toThrow('no mission to draw')});
 it('opens the next mission draw, and the Power Card draw, only once the mission is confirmed; never past two missions',()=>{const s=fresh();engine.drawCard(s,'a','MISSION',0);engine.declareMission(s,'a');expect(engine.drawable(s,'a')).toEqual({});
  engine.confirmMission(s,'b','a',true);expect(engine.drawable(s,'a')).toEqual({MISSION:4,POWER:3});engine.drawCard(s,'a','POWER',0);engine.drawCard(s,'a','MISSION',1);expect(s.missions.a.map(m=>m.status)).toEqual(['COMPLETED','ACTIVE']);
  engine.declareMission(s,'a');engine.confirmMission(s,'b','a',true);expect(engine.drawable(s,'a')).toEqual({POWER:2});engine.drawCard(s,'a','POWER',1);expect(engine.drawable(s,'a')).toEqual({});expect(s.inventory.a).toHaveLength(2);expect(new Set(s.inventory.a.map(p=>p.kind)).size).toBe(2);expect(s.stats.a.missionsCompleted).toBe(2)});
 it('records a Power Card draw that lands on a full hand as a full-hand reward, and consumes the draw',()=>{const s=fresh({powerDraws:{a:1},inventory:{a:[{id:'x',kind:'LET_ME_IN'}],b:[]}});s.inventory.a.push({id:'y',kind:'PICKY_KITTY'});expect(engine.drawable(s,'a')).toEqual({MISSION:4,POWER:1});engine.drawCard(s,'a','POWER',0);expect(s.inventory.a).toHaveLength(2);expect(s.rewards.a.inventoryFull).toBe(true);expect(s.powerDraws!.a).toBe(0)});
 it('keeps legacy sessions, whose missions were dealt up front, without any mission draw',()=>{const s=state();expect(s.missionDeck).toBeUndefined();expect(engine.drawable(s,'a')).toEqual({});engine.declareMission(s,'a');engine.confirmMission(s,'b','a',true);expect(engine.drawable(s,'a')).toEqual({POWER:3});expect(s.missions.a[1].status).toBe('ACTIVE')});
 it('offers no draw during the briefing, after the game, or in an outdated session',()=>{expect(engine.drawable(fresh({phase:'HOW_TO_PLAY'}),'a')).toEqual({});expect(engine.drawable(fresh({phase:'GAME_COMPLETE'}),'a')).toEqual({});expect(engine.drawable(fresh({ruleset:undefined}),'a')).toEqual({})});
 it('has the player who missed draw the forfeit; either can pass while it is drawn, and nobody can accept it unseen',async()=>{const s=fresh({cardIds:['m1','m2']});secret(s,0);guess(s,2);
  expect(()=>engine.drawCard(s,'a','FORFEIT',0)).toThrow('Only the player who missed');expect(()=>engine.forfeitVote(s,'b',true)).toThrow('Draw the forfeit first');await expect(next(s,deck)).rejects.toThrow('forfeit');
  expect(()=>engine.drawCard(s,'b','FORFEIT',3)).toThrow('face-down');drawForfeit(s,2);expect(s.forfeit?.stage).toBe('OFFERED');expect(s.forfeitUsed).toEqual([s.forfeit!.cardId]);expect(()=>drawForfeit(s)).toThrow('no forfeit to draw');
  const t=fresh();secret(t,0);guess(t,2);engine.forfeitVote(t,'a',false);expect(t.forfeit?.stage).toBe('PASSED');expect(t.forfeit?.cardId).toBeUndefined();expect(()=>drawForfeit(t)).toThrow('no forfeit to draw')});
 it('deals forfeits not drawn yet, and reuses the pile once every forfeit was drawn',()=>{const s=fresh({forfeitUsed:['f1','f2','f3']});secret(s,0);guess(s,2);expect(engine.forfeitSpread(s)).toBe(1);drawForfeit(s,0);expect(s.forfeit?.cardId).toBe('f4');
  const t=fresh({forfeitUsed:['f1','f2','f3','f4']});expect(engine.forfeitSpread(t)).toBe(3);secret(t,0);guess(t,2);drawForfeit(t,2);expect(['f1','f2','f3','f4']).toContain(t.forfeit?.cardId)});
 it('blocks Power Cards while the forfeit is being drawn',()=>{const s=fresh({inventory:{a:[{id:'x',kind:'LET_ME_IN'}],b:[]}});secret(s,1);guess(s,2);expect(engine.powerAvailability(s,'MIND_READER','a',s.inventory.a[0])).toEqual({usable:false,reason:'Settle the forfeit first.'})});
});

describe('Power Card: Picky Kitty',()=>{
 const owned=(over:Partial<InternalState>={})=>state({heat:2,cardIds:['mind','m2','m3'],inventory:{a:[{id:'pk',kind:'PICKY_KITTY'}],b:[]},...over});
 const mindPool=[...pool('q',[1,2,2,3,4,5,1,2]),{id:'mind',intensity:2},{id:'m2',intensity:1},{id:'m3',intensity:2}];
 it('offers three eligible questions within the heat cap when three exist, none of them this card or already played',()=>{for(let i=0;i<20;i++){const s=owned();engine.usePower(s,'MIND_READER','a','pk',mindPool);const c=s.picky!.candidates;
  expect(c).toHaveLength(3);expect(new Set(c).size).toBe(3);expect(c).not.toContain('mind');expect(c.every((id:string)=>mindPool.find(q=>q.id===id)!.intensity<=2)).toBe(true);expect(s.inventory.a[0].armed).toBe(true)}});
 it('offers two or one when that is all the heat cap leaves, and is refused unspent at zero',()=>{const lone=(n:number)=>[...pool('q',[1,2,1].slice(0,n)),{id:'mind',intensity:1},{id:'hot',intensity:5}];
  for(const n of [3,2,1]){const s=owned({cardIds:['mind']});engine.usePower(s,'MIND_READER','a','pk',lone(n));expect(s.picky!.candidates).toHaveLength(n);expect(s.picky!.candidates).not.toContain('hot');expect(s.inventory.a).toHaveLength(1);engine.pickQuestion(s,'a',s.picky!.candidates[0]);expect(s.inventory.a).toEqual([])}
  const none=owned({cardIds:['mind']});const before=JSON.stringify(none);expect(()=>engine.usePower(none,'MIND_READER','a','pk',lone(0))).toThrow('No fresh question');expect(JSON.stringify(none)).toBe(before)});
 it('never offers a question already used off-deck by a Double Challenge',()=>{const s=owned({cardIds:['mind'],extraCardIds:['q0']});engine.usePower(s,'MIND_READER','a','pk',pool('q',[1,1]));expect(s.picky!.candidates).toEqual(['q1'])});
 it('holds the card while choosing, blocks answers, and spends it on the pick, which both players then answer',()=>{const s=owned();engine.usePower(s,'MIND_READER','a','pk',mindPool);
  expect(()=>secret(s,0)).toThrow('Wait for the question');expect(()=>engine.pickQuestion(s,'b',s.picky!.candidates[0])).toThrow('Only the Picky Kitty owner');expect(()=>engine.pickQuestion(s,'a','q4')).toThrow('offered');
  const pick=s.picky!.candidates.find((id:string)=>id.startsWith('q'))!;engine.pickQuestion(s,'a',pick);expect(s.cardIds[0]).toBe(pick);expect(s.cardIds).toHaveLength(3);expect(s.inventory.a).toEqual([]);expect(s.picky).toBeUndefined();
  secret(s,1);guess(s,1);expect(s.scores.b).toBe(1);expect(s.stats.b.reads).toBe(1);expect(s.predictions[0].questionId).toBe(pick)});
 it('swaps with a later card when it picks one, so the deck keeps every card and the unpicked stay unplayed',()=>{const s=owned();engine.usePower(s,'MIND_READER','a','pk',[{id:'mind',intensity:2},{id:'m2',intensity:1},{id:'m3',intensity:2},{id:'f',intensity:2}]);
  expect([...s.picky!.candidates].sort()).toEqual(['f','m2','m3']);engine.pickQuestion(s,'a','m3');expect(s.cardIds).toEqual(['m3','m2','mind'])});
 it('is refused without being spent when too late or twice on one card',()=>{const late=owned();secret(late,0);expect(()=>engine.usePower(late,'MIND_READER','a','pk',mindPool)).toThrow('before anyone answers');expect(late.inventory.a).toHaveLength(1);
  const twice=owned({inventory:{a:[{id:'pk',kind:'PICKY_KITTY'},{id:'pk2',kind:'PICKY_KITTY'}],b:[]}});engine.usePower(twice,'MIND_READER','a','pk',mindPool);engine.pickQuestion(twice,'a',twice.picky!.candidates[0]);expect(()=>engine.usePower(twice,'MIND_READER','a','pk2',mindPool)).toThrow('already picked');expect(twice.inventory.a).toHaveLength(1)});
 it('goes back to its owner unspent when cancelled or when the card is skipped',()=>{const s=owned();engine.usePower(s,'MIND_READER','a','pk',mindPool);expect(()=>engine.cancelPower(s,'b','pk')).toThrow('Nothing to cancel');engine.cancelPower(s,'a','pk');expect(s.inventory.a).toEqual([{id:'pk',kind:'PICKY_KITTY'}]);expect(s.picky).toBeUndefined();
  engine.usePower(s,'MIND_READER','a','pk',mindPool);engine.skip(s,'MIND_READER');expect(s.inventory.a).toEqual([{id:'pk',kind:'PICKY_KITTY'}])});
 it('keeps an open pick through a reconnect',()=>{const s=owned();engine.usePower(s,'MIND_READER','a','pk',mindPool);const restored=normalize(JSON.parse(JSON.stringify(s)));expect(restored.picky).toEqual(s.picky);expect(restored.inventory.a[0].armed).toBe(true);engine.pickQuestion(restored,'a',restored.picky!.candidates[0]);expect(restored.inventory.a).toEqual([])});
 it('also works before a Counter Mind card is answered',()=>{const s=owned({pendingTwist:'COUNTER_MIND'});engine.beginRound(s,'MIND_READER');engine.usePower(s,'MIND_READER','a','pk',mindPool);expect(()=>counter(s,'a',0,0)).toThrow('Wait for the question');engine.pickQuestion(s,'a',s.picky!.candidates[0]);counter(s,'a',0,0);expect(s.counter.a).toEqual({choice:0,prediction:0})});
});

describe('Power Card: Let Me In!',()=>{
 const revealed=()=>{const s=state({inventory:{a:[],b:[{id:'lm',kind:'LET_ME_IN'},{id:'lm2',kind:'LET_ME_IN'}]}});secret(s,1);guess(s,1);return s};
 it('only activates after a reveal, and an early try keeps the card',()=>{const s=state({inventory:{a:[],b:[{id:'lm',kind:'LET_ME_IN'}]}});expect(()=>engine.usePower(s,'MIND_READER','b','lm')).toThrow('once the answers are revealed');secret(s,1);expect(()=>engine.usePower(s,'MIND_READER','b','lm')).toThrow('once the answers are revealed');expect(s.inventory.b).toHaveLength(1);expect(s.followUp).toBeUndefined()});
 it('cannot activate once the card has closed',async()=>{const s=revealed();await next(s,{mind:'MIND_READER',m2:'CHEMISTRY'});expect(()=>engine.usePower(s,'CHEMISTRY','b','lm')).toThrow('Mind Reader');expect(s.inventory.b).toHaveLength(2)});
 it('asks the partner why they chose their answer, and the reply never changes the result',()=>{const s=revealed();const before=snapshot(s);engine.usePower(s,'MIND_READER','b','lm');
  expect(s.followUp).toEqual({askerId:'b',responderId:'a',choice:1,role:'ANSWER',stage:'ASKED'});expect(s.inventory.b.map((p:any)=>p.id)).toEqual(['lm2']);
  const restored=normalize(JSON.parse(JSON.stringify(s)));expect(restored.followUp).toEqual(s.followUp);
  expect(()=>engine.followUpReply(s,'b',true,'mine')).toThrow('Only your partner');engine.followUpReply(s,'a',true,` ${'x'.repeat(400)} `);expect(s.followUp?.stage).toBe('ANSWERED');expect(s.followUp?.reply).toHaveLength(280);expect(snapshot(s)).toEqual(before);
  expect(()=>engine.followUpReply(s,'a',true,'again')).toThrow('No follow-up')});
 it('can be declined with no penalty, never blocks moving on, and a late reply is refused',async()=>{const s=revealed();const before=snapshot(s);engine.usePower(s,'MIND_READER','b','lm');engine.followUpReply(s,'a',false);expect(s.followUp?.stage).toBe('DECLINED');expect(snapshot(s)).toEqual(before);
  const t=revealed();engine.usePower(t,'MIND_READER','b','lm');await next(t,{mind:'MIND_READER',m2:'MIND_READER'});expect(t.followUp).toBeUndefined();
  const after=JSON.stringify(t);expect(()=>engine.followUpReply(t,'a',true,'late')).toThrow('No follow-up');expect(JSON.stringify(t)).toBe(after)});
 it('asks about the guess when the partner was the guesser, once per player per reveal',()=>{const s=state({inventory:{a:[{id:'x',kind:'LET_ME_IN'},{id:'y',kind:'LET_ME_IN'}],b:[]}});secret(s,1);guess(s,2);engine.forfeitVote(s,'b',false);engine.usePower(s,'MIND_READER','a','x');expect(s.followUp).toEqual(expect.objectContaining({responderId:'b',choice:2,role:'GUESS'}));
  engine.followUpReply(s,'b',true);expect(()=>engine.usePower(s,'MIND_READER','a','y')).toThrow('already asked');expect(s.inventory.a).toHaveLength(1)});
 it('waits for an open forfeit to be settled first',()=>{const s=state({inventory:{a:[{id:'x',kind:'LET_ME_IN'}],b:[]}});secret(s,1);guess(s,2);expect(()=>engine.usePower(s,'MIND_READER','a','x')).toThrow('Settle the forfeit');expect(s.inventory.a).toHaveLength(1)});
});

describe('Power Card: A Little Present',()=>{
 const chem=pool('c',[1,2,3,4,5,3]);
 const revealed=()=>{const s=state({cardIds:['mind','c0'],inventory:{a:[],b:[{id:'gift',kind:'A_LITTLE_PRESENT'},{id:'gift2',kind:'A_LITTLE_PRESENT'}]}});secret(s,1);guess(s,1);return s};
 it('offers a fresh Bonus Moment from tonight’s heat, outside the 12-card deck, only after a finished Mind Reader card',()=>{const early=revealed();early.phase='WAITING_FOR_GUESS';expect(()=>engine.usePower(early,'MIND_READER','b','gift',chem)).toThrow('complete');expect(early.inventory.b).toHaveLength(2);
  const s=revealed();engine.usePower(s,'MIND_READER','b','gift',chem);expect(s.bonus).toEqual(expect.objectContaining({giverId:'b',receiverId:'a',stage:'OFFERED'}));expect(chem.find(c=>c.id===s.bonus!.cardId)!.intensity).toBeLessThanOrEqual(3);expect(s.bonus!.cardId).not.toBe('c0');
  expect(s.cardIds).toEqual(['mind','c0']);expect(s.inventory.b.map((p:any)=>p.id)).toEqual(['gift2']);expect(()=>engine.usePower(s,'MIND_READER','b','gift2',chem)).toThrow('already given')});
 it('never repeats a dealt or already-offered challenge, and with none left it is refused unspent',async()=>{const s=revealed();const only=[{id:'c0',intensity:1},{id:'c1',intensity:1},{id:'hot',intensity:5}];
  engine.usePower(s,'MIND_READER','b','gift',only);expect(s.bonus!.cardId).toBe('c1');
  const t=revealed();t.bonusCardIds=['c1'];const before=JSON.stringify(t);expect(()=>engine.usePower(t,'MIND_READER','b','gift',only)).toThrow('No Bonus Moment fits');expect(JSON.stringify(t)).toBe(before)});
 it('waits until both parts of a Double Challenge are done',async()=>{const s=state({cardIds:['m1','m2'],pendingTwist:'DOUBLE_CHALLENGE',inventory:{a:[{id:'gift',kind:'A_LITTLE_PRESENT'}],b:[]}});engine.beginRound(s,'MIND_READER','x1');secret(s,0);guess(s,0);
  expect(()=>engine.usePower(s,'MIND_READER','a','gift',chem)).toThrow('complete');await next(s,{m1:'MIND_READER',m2:'MIND_READER'});secret(s,1);guess(s,1);engine.usePower(s,'MIND_READER','a','gift',chem);expect(s.bonus?.stage).toBe('OFFERED')});
 it('happens only if both say yes, and a no costs nothing',()=>{const s=revealed();engine.usePower(s,'MIND_READER','b','gift',chem);const before=snapshot(s);engine.bonusVote(s,'b',true);expect(s.bonus?.stage).toBe('OFFERED');expect(()=>engine.bonusDone(s,'a',true)).toThrow('not in progress');
  engine.bonusVote(s,'a',false);expect(s.bonus?.stage).toBe('DECLINED');expect(snapshot(s)).toEqual(before)});
 it('is complete only once both confirm, can be stopped by either, and never touches Spark, stats, or the result',()=>{const s=revealed();engine.usePower(s,'MIND_READER','b','gift',chem);const before=snapshot(s);engine.bonusVote(s,'a',true);engine.bonusVote(s,'b',true);expect(s.bonus?.stage).toBe('ACCEPTED');
  engine.bonusDone(s,'a',true);expect(s.bonus?.stage).toBe('ACCEPTED');expect(()=>engine.bonusDone(s,'a',true)).toThrow('already confirmed');const restored=normalize(JSON.parse(JSON.stringify(s)));engine.bonusDone(restored,'b',true);expect(restored.bonus?.stage).toBe('COMPLETED');expect(snapshot(restored)).toEqual(before);
  const t=revealed();engine.usePower(t,'MIND_READER','b','gift',chem);engine.bonusVote(t,'a',true);engine.bonusVote(t,'b',true);engine.bonusDone(t,'b',false);expect(t.bonus?.stage).toBe('STOPPED')});
 it('never blocks moving on, and closes with the card',async()=>{const s=revealed();engine.usePower(s,'MIND_READER','b','gift',chem);await next(s,{mind:'MIND_READER',c0:'CHEMISTRY'});expect(s.bonus).toBeUndefined();expect(()=>engine.bonusVote(s,'a',true)).toThrow('no Bonus Moment')});
});

describe('Power Card ownership',()=>{
 it('refuses cards the player does not own, and work only on Mind Reader cards, without spending anything',()=>{const s=state({inventory:{a:[{id:'pa',kind:'PICKY_KITTY'}],b:[{id:'pb',kind:'LET_ME_IN'}]}});expect(()=>engine.usePower(s,'MIND_READER','a','pb')).toThrow('not owned');expect(()=>engine.usePower(s,'MIND_READER','a','nope')).toThrow('not owned');
  expect(()=>engine.usePower(s,'CHEMISTRY','a','pa',[])).toThrow('Mind Reader');expect(s.inventory).toEqual({a:[{id:'pa',kind:'PICKY_KITTY'}],b:[{id:'pb',kind:'LET_ME_IN'}]})});
 it('spends a card exactly once: replaying the same activation finds nothing to spend',()=>{const s=state({inventory:{a:[],b:[{id:'lm',kind:'LET_ME_IN'}]}});secret(s,1);guess(s,1);engine.usePower(s,'MIND_READER','b','lm');engine.followUpReply(s,'a',false);expect(()=>engine.usePower(s,'MIND_READER','b','lm')).toThrow('not owned');expect(s.inventory.b).toEqual([])});
 it('explains why a card is unavailable',()=>{const s=state({phase:'REVEAL'});expect(engine.powerAvailability(s,'MIND_READER','a',{id:'p',kind:'PICKY_KITTY'})).toEqual({usable:false,reason:expect.stringContaining('before anyone answers')})});
 it('cleans player-written text',()=>{expect(cleanText(' a\u0000b \n c ',140)).toBe('a b c');expect(cleanText(42,140)).toBe('');expect(cleanText('x'.repeat(200),140)).toHaveLength(140)});
});

describe('heat selection',()=>{
 it('never picks above the agreed heat and favours the limit',()=>{const cards=[1,2,3,4,5].flatMap(h=>Array.from({length:6},(_,i)=>({id:`${h}-${i}`,intensity:h})));for(let i=0;i<20;i++){const ids=engine.pickByHeat(cards,3,5) as string[];expect(ids).toHaveLength(5);expect(ids.every(id=>Number(id[0])<=3)).toBe(true);expect(ids.filter(id=>id[0]==='3').length).toBeGreaterThanOrEqual(3)}});
 it('builds a 12-card schedule that opens with Mind Reader and puts a Mind Reader card after every twist, before the next one',()=>{for(let i=0;i<50;i++){const order=engine.buildSchedule({MIND_READER:['m1','m2','m3','m4','m5'],CHEMISTRY:['c1','c2','c3'],MUTUAL_DESIRE:['d1','d2'],PLOT_TWIST:['t1','t2']}) as string[];expect(order).toHaveLength(12);expect(new Set(order).size).toBe(12);expect(order[0][0]).toBe('m');
  const kinds=order.map(id=>id[0]).join('').replace(/[cd]/g,'');expect(kinds).not.toMatch(/tt|t$/)}});
 it('deals two distinct twist effects and never a card whose effect this ruleset does not define',()=>{const cards=[['twist-01','ROLE_REVERSAL'],['twist-02','DOUBLE_CHALLENGE'],['twist-04','COUNTER_MIND'],['twist-05','ONE_MORE_QUESTION'],['old','DOUBLE_SPARK']].map(([id,e])=>({id,choices:[e]}));
  for(let i=0;i<40;i++){const ids=engine.pickTwists(cards) as string[];expect(ids).toHaveLength(2);expect(ids).not.toContain('old');expect(new Set(ids.map(id=>twistEffect(cards.find(c=>c.id===id)!))).size).toBe(2)}
  expect(twistEffect({choices:['DOUBLE_SPARK']})).toBeUndefined()});
});

describe('rules versioning',()=>{
 it('fixes each dealt twist effect at deal time, so a later re-seed cannot change a card in play',()=>{const s=state({twistEffects:{'twist-02':'DOUBLE_CHALLENGE'}});expect(engine.dealtTwist(s,'twist-02')).toBe('DOUBLE_CHALLENGE');
  const restored=normalize(JSON.parse(JSON.stringify(s)));expect(engine.dealtTwist(restored,'twist-02')).toBe('DOUBLE_CHALLENGE');expect(()=>engine.dealtTwist(s,'twist-04')).toThrow('Unknown Plot Twist')});
 it('marks a session dealt before this ruleset as outdated and leaves its stored cards exactly as they were',()=>{const old={...JSON.parse(JSON.stringify(state())),ruleset:undefined,pendingTwists:['DOUBLE_SPARK'],firstMiss:1,
  inventory:{a:[{id:'p1',kind:'DOUBLE_SPARK',armed:true},{id:'p2',kind:'SECOND_CHANCE'}],b:[{id:'p3',kind:'ROLE_REVERSAL'}]},twistNotice:{kind:'ROLE_REVERSAL',source:'POWER_CARD',normalSecretPlayerId:'a',secretPlayerId:'b'}};
  const s=normalize(JSON.parse(JSON.stringify(old)));expect(isOutdated(s)).toBe(true);expect(isOutdated(state())).toBe(false);
  // Nothing is reinterpreted or removed: no retired card becomes a new one, no old twist becomes a new effect.
  expect(s.inventory).toEqual(old.inventory);expect((s as any).pendingTwists).toEqual(['DOUBLE_SPARK']);expect(s.pendingTwist).toBeUndefined();expect(s.twistNotice).toEqual(old.twistNotice)});
 it('still normalizes very old sessions without crashing',()=>{const s=normalize({phase:'CHEMISTRY_CONFIRM',round:2,version:4,cardIds:[],secretPlayerId:'a',guessingPlayerId:'b',scores:{a:1,b:0},missions:{a:{cardId:'m',status:'ACTIVE'}},inventory:{a:[],b:[]},votes:{},confirmations:{a:true},desires:{},twistAcks:{}});
  expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.players).toEqual(['a','b']);expect(s.missions.a).toEqual([{cardId:'m',status:'ACTIVE',notYet:0}]);expect(s.chemDone).toEqual({a:true});expect(s.stats.a).toEqual(zero());expect(isOutdated(s)).toBe(true)});
});

describe('private state projection',()=>{
 const drawFixture=(s:InternalState)=>fixture(s);
 const fixture=(s:InternalState)=>({room:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'r',code:'ABC123',status:'PLAYING',selectedGame:'read-my-mind',expiresAt:new Date(),players:[{id:'a',nickname:'A',isHost:true,connected:true,ready:true,maxHeat:4},{id:'b',nickname:'B',isHost:false,connected:true,ready:true,maxHeat:3}],sessions:[{id:'session',state:s}]})},gameCard:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'mind',type:'MIND_READER',question:'Question?',choices:['One','Two','Three'],intensity:2,artworkPath:'/card.png',challenge:null}),findMany:jest.fn().mockImplementation(({where})=>Promise.resolve(where.id.in.map((id:string)=>({id,question:`Text ${id}`}))))}});
 it('does not expose a secret answer, the partner mission, or the partner inventory before reveal',async()=>{const s=state({phase:'WAITING_FOR_GUESS',secretChoice:2,inventory:{a:[{id:'secret-power',kind:'LET_ME_IN'}],b:[]}});const view=await new GameEngine(fixture(s) as any).project('r','b');const json=JSON.stringify(view);expect(view.game?.hasSubmittedSecret).toBe(true);expect(view.game?.result).toBeUndefined();expect(json).not.toContain('secretChoice');expect(json).not.toContain('Text ma');expect(json).not.toContain('secret-power');expect(view.game?.mission?.text).toBe('Text mb');expect(view.game?.inventoryCounts.a).toBe(1);expect(view.agreedHeat).toBe(4)});
 it('projects only the size of each spread: no undrawn mission, Power Card or forfeit reaches either phone',async()=>{const s=state({missions:{a:[],b:[]},missionDeck:{a:['ma','ma2'],b:['mb']},powerDraws:{b:1},forfeitIds:['f1','f2']});secret(s,0);guess(s,2);
  const a=await new GameEngine(drawFixture(s) as any).project('r','a'),b=await new GameEngine(drawFixture(s) as any).project('r','b');
  expect(a.game?.draws).toEqual({MISSION:2});expect(b.game?.draws).toEqual({MISSION:1,POWER:3});expect(a.game?.mission).toBeUndefined();expect(a.game?.missionsLeft).toBe(2);expect(b.game?.missionsLeft).toBe(1);
  expect(a.game?.forfeit).toEqual({text:'',stage:'DRAWING',payerId:'b',iVoted:false,cards:2});expect(b.game?.forfeit?.cards).toBe(2);
  for(const v of [a,b]){const json=JSON.stringify(v);for(const hidden of ['ma','ma2','mb','f1','f2','Text ma','Text mb','PICKY_KITTY','LET_ME_IN','A_LITTLE_PRESENT'])expect(json).not.toContain(`"${hidden}"`)}
  engine.drawCard(s,'a','MISSION',1);const drawn=await new GameEngine(drawFixture(s) as any).project('r','a');expect(drawn.game?.mission).toEqual(expect.objectContaining({number:1,total:2,status:'ACTIVE'}));expect(drawn.game?.draws).toBeUndefined();expect(drawn.game?.missionsLeft).toBe(2)});
 it('reveals a partner mission only once it is claimed',async()=>{const s=state();s.missions.a[0].status='DECLARED';const view=await new GameEngine(fixture(s) as any).project('r','b');expect(view.game?.opponentMissionDeclared).toEqual(expect.objectContaining({text:'Text ma',ownerId:'a',number:1,total:2}))});
 it('hides the partner chemistry consent until the viewer answers',async()=>{const s=state({phase:'CHEMISTRY_CONSENT',votes:{a:true}});const db=fixture(s);db.gameCard.findUniqueOrThrow.mockResolvedValue({id:'c',type:'CHEMISTRY',question:'Kiss',choices:['Agree','Decline'],intensity:3,artworkPath:'/x.png',challenge:'Slowly'});const view=await new GameEngine(db as any).project('r','b');expect(view.game?.chemistry).toEqual({stage:'INVITATION',iConsented:false,iFinished:false,partnerFinished:false,sparksEach:1,iReady:false,serverNow:expect.any(String),timerExpired:false});expect(JSON.stringify(view)).not.toContain('"votes"')});
 it('projects power availability with a reason, and the new card copy',async()=>{const s=state({inventory:{a:[],b:[{id:'p',kind:'PICKY_KITTY'}]},phase:'WAITING_FOR_GUESS',secretChoice:1});const view=await new GameEngine(fixture(s) as any).project('r','b');expect(view.game?.inventory[0]).toEqual(expect.objectContaining({title:'Picky Kitty',status:'READY',usable:false,reason:expect.any(String)}));expect(view.game?.sparkValue).toBe(1)});
 it('hides a Counter Mind submission from the partner, before and after a reconnect, until both are in',async()=>{const s=state({pendingTwist:'COUNTER_MIND'});engine.beginRound(s,'MIND_READER');counter(s,'a',2,0);const stored=JSON.parse(JSON.stringify(s));
  const partner=await new GameEngine(fixture(stored) as any).project('r','b'),again=await new GameEngine(fixture(stored) as any).project('r','b'),own=await new GameEngine(fixture(stored) as any).project('r','a');
  expect(partner.game?.counterMind).toEqual({iSubmitted:false,partnerSubmitted:true});expect(again.game?.counterMind).toEqual(partner.game?.counterMind);expect(partner.game?.result).toBeUndefined();
  const json=JSON.stringify(partner);expect(json).not.toContain('"counter"');expect(json).not.toContain('myChoice');expect(json).not.toContain('prediction');
  expect(own.game?.counterMind).toEqual({iSubmitted:true,partnerSubmitted:false,myChoice:2,myPrediction:0});expect(own.game?.hasSubmittedChoice).toBe(true);expect(own.game?.twistNotice?.kind).toBe('COUNTER_MIND');
  expect(own.game?.version).toBe(partner.game?.version);expect(own.game?.phase).toBe(partner.game?.phase)});
 it('never sends Double Challenge part B’s question before part B, then projects it to both',async()=>{const s=state({cardIds:['mind'],pendingTwist:'DOUBLE_CHALLENGE'});engine.beginRound(s,'MIND_READER','x2');const db=fixture(s);
  db.gameCard.findUniqueOrThrow.mockImplementation(({where}:any)=>Promise.resolve({id:where.id,type:'MIND_READER',question:`Q ${where.id}`,choices:['One','Two','Three'],intensity:1,artworkPath:'/x.png',challenge:null}));
  for(const p of ['a','b']){const v=await new GameEngine(db as any).project('r',p);expect(v.game?.card.id).toBe('mind');expect(v.game?.challengePart).toBe(1);expect(JSON.stringify(v)).not.toContain('x2')}
  secret(s,0);guess(s,0);await next(s,{mind:'MIND_READER'});for(const p of ['a','b']){const v=await new GameEngine(db as any).project('r',p);expect(v.game?.card).toEqual(expect.objectContaining({id:'x2',question:'Q x2'}));expect(v.game?.challengePart).toBe(2)}});
 it('does not leak the locked answer during One More Question',async()=>{const s=state({pendingTwist:'ONE_MORE_QUESTION'});engine.beginRound(s,'MIND_READER');secret(s,2);mr(s,'b','ASK_QUESTION',{text:'Is it C?'});
  const v=await new GameEngine(fixture(s) as any).project('r','b');expect(v.game?.phase).toBe('QUESTION_TIME');expect(v.game?.mySecretChoice).toBeUndefined();expect(v.game?.result).toBeUndefined();expect(JSON.stringify(v)).not.toContain('secretChoice')});
 it('flags an outdated session instead of offering its retired cards',async()=>{const s={...state({inventory:{a:[{id:'old',kind:'DOUBLE_SPARK' as any}],b:[]}}),ruleset:undefined};const v=await new GameEngine(fixture(s) as any).project('r','a');
  expect(v.game?.outdated).toBe(true);expect(v.game?.inventory).toEqual([]);expect(v.game?.inventoryCounts.a).toBe(1)});
 it('shows Picky Kitty candidates to their owner only',async()=>{const s=state({inventory:{a:[{id:'pk',kind:'PICKY_KITTY'}],b:[]},cardIds:['mind']});engine.usePower(s,'MIND_READER','a','pk',pool('q',[1,2,3,3]));
  const owner=await new GameEngine(fixture(s) as any).project('r','a'),partner=await new GameEngine(fixture(s) as any).project('r','b');
  expect(owner.game?.pickyKitty?.candidates?.map(c=>c.id).sort()).toEqual([...s.picky!.candidates].sort());expect(owner.game?.pickyKitty?.candidates?.[0].question).toMatch(/^Text q/);expect(owner.game?.inventory[0].status).toBe('ARMED');
  expect(partner.game?.pickyKitty).toEqual({ownerId:'a'});for(const id of s.picky!.candidates)expect(JSON.stringify(partner)).not.toContain(id)});
 it('keeps a Bonus Moment vote private until the viewer answers, and pending twists visible to both',async()=>{const s=state({inventory:{a:[],b:[{id:'gift',kind:'A_LITTLE_PRESENT'}]},pendingTwist:'ONE_MORE_QUESTION'});secret(s,1);guess(s,1);engine.usePower(s,'MIND_READER','b','gift',pool('c',[1,2]));engine.bonusVote(s,'b',true);
  const a=await new GameEngine(fixture(s) as any).project('r','a'),b=await new GameEngine(fixture(s) as any).project('r','b');
  expect(a.game?.bonusMoment).toEqual(expect.objectContaining({giverId:'b',receiverId:'a',stage:'OFFERED',iAccepted:false,iAnswered:false,question:expect.stringMatching(/^Text c/)}));expect(b.game?.bonusMoment).toEqual(expect.objectContaining({iAccepted:true,iAnswered:true}));expect(JSON.stringify(a)).not.toContain('"votes"');
  expect(a.game?.pendingTwist).toBe('ONE_MORE_QUESTION');expect(b.game?.pendingTwist).toBe('ONE_MORE_QUESTION')});
 describe('localized projection',()=>{
 const mind={id:'mind',type:'MIND_READER',question:'Question?',choices:['One','Two','Three'],intensity:2,artworkPath:'/card.png',challenge:null};
 const localizedDb=(s:InternalState)=>{const db=fixture(s);
  db.gameCard.findUniqueOrThrow.mockImplementation(({include}:any)=>Promise.resolve({...mind,...(include?{translations:[{question:'Câu hỏi?',choices:['Một','Hai','Ba'],challenge:null}]}:{})}));
  db.gameCard.findMany.mockImplementation(({where,include}:any)=>Promise.resolve(where.id.in.map((id:string)=>({id,question:`Text ${id}`,choices:[],challenge:null,...(include?{translations:[{question:`Văn bản ${id}`,choices:[],challenge:null}]}:{})}))));
  return db};
 it('shows the same card to each player in their own language, sharing id, answer order and version',async()=>{
  const s=state({phase:'WAITING_FOR_GUESS',secretChoice:1});const db=localizedDb(s);
  const vi=await new GameEngine(db as any).project('r','a','vi'),en=await new GameEngine(db as any).project('r','b','en');
  expect(vi.game?.card).toMatchObject({id:'mind',question:'Câu hỏi?',choices:['Một','Hai','Ba']});
  expect(en.game?.card).toMatchObject({id:'mind',question:'Question?',choices:['One','Two','Three']});
  expect(vi.game?.version).toBe(en.game?.version);expect(vi.game?.mySecretChoice).toBe(1);expect(en.game?.mySecretChoice).toBeUndefined();
  expect(vi.game?.mission?.text).toBe('Văn bản ma');expect(en.game?.mission?.text).toBe('Text mb');
 });
 it('never lets a translation change the number of answers',()=>{
  expect(localizeCard({...mind,translations:[{question:'H',choices:['x','y'],challenge:null}]}).choices).toEqual(['One','Two','Three']);
  expect(localizeCard({...mind,translations:[]}).question).toBe('Question?');
 });
 it('defaults unknown locales to Vietnamese',()=>{expect(toLocale('fr')).toBe('vi');expect(toLocale(undefined)).toBe('vi');expect(toLocale('en')).toBe('en')});
});
});
