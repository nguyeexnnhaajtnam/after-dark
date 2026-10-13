import {chemistryDeadline,chemistryTiming,GameEngine,localizeCard,normalize,toLocale,type InternalState} from './game.engine';

const state=(over:Partial<InternalState>={}):InternalState=>({phase:'WAITING_FOR_SECRET',round:1,version:1,seed:0,heat:3,players:['a','b'],cardIds:['mind'],forfeitIds:['f1','f2'],wrongGuesses:0,
 secretPlayerId:'a',guessingPlayerId:'b',scores:{a:0,b:0},stats:{a:{correctReads:0,reads:0,chemistryCompleted:0,missionsCompleted:0},b:{correctReads:0,reads:0,chemistryCompleted:0,missionsCompleted:0}},
 missions:{a:[{cardId:'ma',status:'ACTIVE',notYet:0},{cardId:'ma2',status:'ACTIVE',notYet:0}],b:[{cardId:'mb',status:'ACTIVE',notYet:0}]},
 inventory:{a:[],b:[]},rewards:{},howToPlayAcks:{},votes:{},chemDone:{},chemReady:{},chemDoneAt:{},desires:{},twistAcks:{},pendingTwists:[],...over});
const action=(type:string,extra={})=>({actionId:crypto.randomUUID(),expectedVersion:1,type,...extra} as any);
const engine=new GameEngine({} as any) as any;
const secret=(s:InternalState,choice:number)=>engine.mindReader(s,s.secretPlayerId,action('SUBMIT_SECRET',{choice}));
const guess=(s:InternalState,choice:number)=>engine.mindReader(s,s.guessingPlayerId,action('SUBMIT_GUESS',{choice}));

describe('How to Play briefing',()=>{
 it('starts the first round only after both players acknowledge',()=>{const s=state({phase:'HOW_TO_PLAY'});engine.ackHowToPlay(s,'a','MIND_READER');expect(s.phase).toBe('HOW_TO_PLAY');engine.ackHowToPlay(s,'b','MIND_READER');expect(s.phase).toBe('WAITING_FOR_SECRET');expect(s.secretPlayerId).toBe('a')});
});

describe('Mind Reader Sparks and forfeits',()=>{
 it('awards one Spark and a correct-read stat for a right guess, with no forfeit',()=>{const s=state();secret(s,1);expect(s.phase).toBe('WAITING_FOR_GUESS');guess(s,1);expect(s.result).toEqual(expect.objectContaining({correct:true,sparksEarned:1}));expect(s.scores.b).toBe(1);expect(s.stats.b).toEqual(expect.objectContaining({correctReads:1,reads:1}));expect(s.forfeit).toBeUndefined()});
 it('earns nothing on a wrong guess and offers an optional forfeit to the guesser',()=>{const s=state();secret(s,0);guess(s,2);expect(s.scores.b).toBe(0);expect(s.result?.correct).toBe(false);expect(s.forfeit).toEqual(expect.objectContaining({payerId:'b',stage:'OFFERED',cardId:'f1'}))});
 it('lets either player pass the forfeit, and accepts only when both say yes',()=>{const s=state();secret(s,0);guess(s,2);engine.forfeitVote(s,'b',true);expect(s.forfeit?.stage).toBe('OFFERED');engine.forfeitVote(s,'a',true);expect(s.forfeit?.stage).toBe('ACCEPTED');const t=state();secret(t,0);guess(t,2);engine.forfeitVote(t,'a',false);expect(t.forfeit?.stage).toBe('PASSED');expect(t.scores).toEqual({a:0,b:0})});
 it('rejects a duplicate forfeit vote',()=>{const s=state();secret(s,0);guess(s,2);engine.forfeitVote(s,'b',true);expect(()=>engine.forfeitVote(s,'b',true)).toThrow('already answered')});
 it('rejects actions from the wrong player',()=>{const s=state();expect(()=>engine.mindReader(s,'b',action('SUBMIT_SECRET',{choice:0}))).toThrow('Not your turn');secret(s,0);expect(()=>engine.mindReader(s,'a',action('SUBMIT_GUESS',{choice:0}))).toThrow('Not your turn')});
 it('uses deterministic copy variants shared by both players',()=>{const s=state({seed:40,round:3});secret(s,0);guess(s,0);expect(s.result?.variant).toBe((40+3*31)%1000)});
});

describe('Chemistry lifecycle',()=>{
 it('requires mutual consent, an explicit start, and completion from both, then pays one Spark each',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));expect(s.phase).toBe('CHEMISTRY_CONSENT');engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:true}));expect(s.phase).toBe('CHEMISTRY_ACCEPTED');expect(s.scores).toEqual({a:0,b:0});
  engine.chemistry(s,'a',action('CHEMISTRY_START'));expect(s.phase).toBe('CHEMISTRY_ACCEPTED');engine.chemistry(s,'b',action('CHEMISTRY_START'));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');engine.chemistry(s,'a',action('CHEMISTRY_DONE'));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores.a).toBe(0);
  engine.chemistry(s,'b',action('CHEMISTRY_DONE'));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1});expect(s.stats.a.chemistryCompleted).toBe(1)});
 it('ends without penalty when one player declines',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:false}));expect(s.phase).toBe('ROUND_COMPLETE');expect(s.result?.chemistry).toBe('DECLINED');expect(s.scores).toEqual({a:0,b:0})});
 it('never treats consent as completion, and can be stopped after acceptance',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:true}));expect(()=>engine.chemistry(s,'a',action('CHEMISTRY_DONE'))).toThrow('not in progress');engine.chemistry(s,'b',action('CHEMISTRY_STOP'));expect(s.result?.chemistry).toBe('SKIPPED');expect(s.scores).toEqual({a:0,b:0})});
 it('rejects a repeated yes but always allows withdrawing consent',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));expect(()=>engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}))).toThrow('already answered');engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:false}));expect(s.result?.chemistry).toBe('DECLINED')});
 it('predicts the normal next chooser for Plot Twist copy',()=>{const s=state({phase:'PLOT_TWIST',lastMindSecretId:'a'});expect(engine.nextMindSecret(s,'PLOT_TWIST')).toBe('b');const r=state({phase:'REVEAL'});expect(engine.nextMindSecret(r,'MIND_READER')).toBe('b')});
});

describe('Chemistry countdown',()=>{
 const T0=new Date('2026-10-13T20:00:00.000Z'),at=(ms:number)=>new Date(T0.getTime()+ms);
 const agreed=()=>{const s=state({phase:'CHEMISTRY_CONSENT'});engine.chemistry(s,'a',action('CHEMISTRY_VOTE',{accept:true}));engine.chemistry(s,'b',action('CHEMISTRY_VOTE',{accept:true}));return s};
 const start=(s:InternalState,p:string,now=T0,seconds:number|null=60)=>engine.chemistry(s,p,action('CHEMISTRY_START'),seconds,now);
 const done=(s:InternalState,p:string,now:Date)=>engine.chemistry(s,p,action('CHEMISTRY_DONE'),60,now);
 const running=()=>{const s=agreed();start(s,'a');start(s,'b',at(1500));return s};
 it('needs mutual consent before anyone can press start, and consent alone starts no clock',()=>{const s=state({phase:'CHEMISTRY_CONSENT'});expect(()=>start(s,'a')).toThrow('not ready to start');const t=agreed();expect(t.phase).toBe('CHEMISTRY_ACCEPTED');expect(t.chemTimer).toBeUndefined();expect(chemistryTiming(t,'a',60,T0)).toEqual(expect.objectContaining({iReady:false,durationSeconds:60,timerExpired:false}));expect(chemistryTiming(t,'a',60,T0).endsAt).toBeUndefined()});
 it('waits with one player ready and the other not',()=>{const s=agreed();start(s,'a');expect(s.phase).toBe('CHEMISTRY_ACCEPTED');expect(s.chemTimer).toBeUndefined();expect(chemistryTiming(s,'a',60,T0).iReady).toBe(true);expect(chemistryTiming(s,'b',60,T0).iReady).toBe(false)});
 it('starts exactly one server-stamped countdown once both are ready, with the deadline fixed from the second press',()=>{const s=running();expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer).toEqual({startedAt:at(1500).toISOString(),durationSeconds:60,endsAt:at(61500).toISOString()})});
 it('rejects a repeated start and never restarts or extends the clock',()=>{const s=agreed();start(s,'a');expect(()=>start(s,'a',at(800))).toThrow('already pressed start');start(s,'b',at(1500));const timer={...s.chemTimer};expect(()=>start(s,'b',at(30000))).toThrow('not ready to start');expect(()=>start(s,'a',at(30000))).toThrow('not ready to start');expect(s.chemTimer).toEqual(timer)});
 it('gives both players the same deadline and a server clock reference, whenever they look',()=>{const s=running();const a=chemistryTiming(s,'a',60,at(20000)),b=chemistryTiming(s,'b',60,at(20000));expect(a.endsAt).toBe(b.endsAt);expect(a.startedAt).toBe(b.startedAt);expect(a.serverNow).toBe(at(20000).toISOString());
  // A client derives remaining = endsAt - (its clock + (serverNow - its clock at receipt)); any local clock skew cancels out.
  const remaining=(view:typeof a,clientNow:number,skew:number)=>Date.parse(view.endsAt!)-(clientNow+(Date.parse(view.serverNow)-(Date.parse(view.serverNow)+skew)));
  expect(remaining(a,at(20000).getTime()+90000,90000)).toBe(remaining(b,at(20000).getTime()-4000,-4000));expect(remaining(a,at(20000).getTime(),0)).toBe(41500)});
 it('completes before the deadline only when both confirm, paying exactly one Spark each',()=>{const s=running();done(s,'a',at(10000));expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores).toEqual({a:0,b:0});expect(chemistryTiming(s,'a',60,at(10000)).iFinishedAt).toBe(at(10000).toISOString());expect(chemistryTiming(s,'b',60,at(10000)).iFinishedAt).toBeUndefined();expect(s.chemTimer?.endsAt).toBe(at(61500).toISOString());
  expect(()=>done(s,'a',at(11000))).toThrow('already confirmed');done(s,'b',at(12000));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1});expect(s.stats.a.chemistryCompleted).toBe(1);expect(()=>done(s,'b',at(13000))).toThrow('not in progress');expect(s.scores).toEqual({a:1,b:1})});
 it('stops for both, without penalty, before the deadline or after one confirmation',()=>{const s=running();engine.chemistry(s,'b',action('CHEMISTRY_STOP'),60,at(5000));expect(s.phase).toBe('ROUND_COMPLETE');expect(s.result?.chemistry).toBe('SKIPPED');expect(s.scores).toEqual({a:0,b:0});
  const t=running();done(t,'a',at(5000));engine.chemistry(t,'a',action('CHEMISTRY_STOP'),60,at(6000));expect(t.result?.chemistry).toBe('SKIPPED');expect(t.scores).toEqual({a:0,b:0});expect(()=>done(t,'b',at(7000))).toThrow('not in progress');
  const w=agreed();start(w,'a');engine.chemistry(w,'b',action('CHEMISTRY_STOP'));expect(w.result?.chemistry).toBe('SKIPPED')});
 it('expires on the deadline without paying or failing anything, and still accepts honest confirmations afterwards',()=>{const s=running();done(s,'a',at(30000));expect(chemistryTiming(s,'a',60,at(61499)).timerExpired).toBe(false);const late=chemistryTiming(s,'b',60,at(61500));expect(late.timerExpired).toBe(true);expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.scores).toEqual({a:0,b:0});expect(s.chemDone.a).toBe(true);
  done(s,'b',at(90000));expect(s.result?.chemistry).toBe('COMPLETED');expect(s.scores).toEqual({a:1,b:1})});
 it('keeps an untimed challenge on the same ready-then-confirm flow, with no deadline',()=>{const s=agreed();start(s,'a',T0,null);start(s,'b',at(1000),null);expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.chemTimer).toEqual({startedAt:at(1000).toISOString()});const v=chemistryTiming(s,'a',null,at(999999));expect(v.timerExpired).toBe(false);expect(v.endsAt).toBeUndefined();expect(chemistryDeadline(s)).toBeUndefined()});
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

describe('Plot Twists',()=>{
 it('registers Role Reversal only after both acknowledge, then applies it to the next Mind Reader round and consumes it',()=>{const s=state({phase:'PLOT_TWIST',lastMindSecretId:'b'});engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),['ROLE_REVERSAL']);expect(s.pendingTwists).toEqual([]);engine.plotTwist(s,'b',action('PLOT_TWIST_ACK'),['ROLE_REVERSAL']);expect(s.pendingTwists).toEqual(['ROLE_REVERSAL']);
  engine.beginRound(s,'MIND_READER');// normal alternation after b chose would make a the chooser
  expect(s.secretPlayerId).toBe('b');expect(s.twistNotice).toEqual(expect.objectContaining({kind:'ROLE_REVERSAL',normalSecretPlayerId:'a',secretPlayerId:'b'}));expect(s.pendingTwists).toEqual([]);
  engine.beginRound(s,'MIND_READER');expect(s.pendingTwists).toEqual([])});
 it('does not stack a duplicate twist',()=>{const s=state({phase:'PLOT_TWIST',pendingTwists:['DOUBLE_SPARK']});engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),['DOUBLE_SPARK']);engine.plotTwist(s,'b',action('PLOT_TWIST_ACK'),['DOUBLE_SPARK']);expect(s.pendingTwists).toEqual(['DOUBLE_SPARK']);expect(s.result?.twistAlreadyPending).toBe(true)});
 it('Double Spark twist doubles the next correct guess and then expires',()=>{const s=state({pendingTwists:['DOUBLE_SPARK']});expect(engine.sparkValue(s,'b')).toBe(2);secret(s,1);guess(s,1);expect(s.scores.b).toBe(2);expect(s.pendingTwists).toEqual([])});
 it('Double Spark twist expires on a wrong guess too',()=>{const s=state({pendingTwists:['DOUBLE_SPARK']});secret(s,1);guess(s,0);expect(s.scores.b).toBe(0);expect(s.pendingTwists).toEqual([])});
 it('Fresh Start clears pending twists',()=>{const s=state({phase:'PLOT_TWIST',pendingTwists:['ROLE_REVERSAL']});engine.plotTwist(s,'a',action('PLOT_TWIST_ACK'),['FRESH_START']);engine.plotTwist(s,'b',action('PLOT_TWIST_ACK'),['FRESH_START']);expect(s.pendingTwists).toEqual([])});
 it('alternates Mind Reader roles by Mind Reader round, not by card',()=>{const s=state({lastMindSecretId:'a'});engine.beginRound(s,'MIND_READER');expect(s.secretPlayerId).toBe('b');expect(s.twistNotice).toBeUndefined()});
});

describe('Secret Missions and rewards',()=>{
 it('awards a Power Card only after partner confirmation, records the reward, and deals the next mission',()=>{const s=state();engine.declareMission(s,'a');expect(s.inventory.a).toHaveLength(0);engine.confirmMission(s,'b','a',true);expect(s.missions.a[0].status).toBe('COMPLETED');expect(s.inventory.a).toHaveLength(1);expect(s.rewards.a).toEqual(expect.objectContaining({powerId:s.inventory.a[0].id,inventoryFull:false}));expect(s.stats.a.missionsCompleted).toBe(1);expect(s.missions.a[1].status).toBe('ACTIVE');expect(()=>engine.confirmMission(s,'b','a',true)).toThrow()});
 it('"Not yet" returns the mission without penalty and counts the attempt',()=>{const s=state();engine.declareMission(s,'a');engine.confirmMission(s,'b','a',false);expect(s.missions.a[0]).toEqual(expect.objectContaining({status:'ACTIVE',notYet:1}));expect(s.inventory.a).toHaveLength(0);expect(s.scores).toEqual({a:0,b:0})});
 it('only the partner can confirm',()=>{const s=state();engine.declareMission(s,'a');expect(()=>engine.confirmMission(s,'a','a',true)).toThrow('Only your partner')});
 it('respects the inventory limit and says so',()=>{const s=state({inventory:{a:[{id:'x',kind:'DOUBLE_SPARK'},{id:'y',kind:'SECOND_CHANCE'}],b:[]}});engine.declareMission(s,'a');engine.confirmMission(s,'b','a',true);expect(s.inventory.a).toHaveLength(2);expect(s.rewards.a.inventoryFull).toBe(true)});
});

describe('Power Cards',()=>{
 it('Double Spark doubles a correct guess when armed beforehand',()=>{const s=state({inventory:{a:[],b:[{id:'p1',kind:'DOUBLE_SPARK'}]}});engine.usePower(s,'MIND_READER','b','p1');expect(s.inventory.b[0].armed).toBe(true);expect(engine.sparkValue(s,'b')).toBe(2);expect(engine.sparkValue(s,'a')).toBe(1);secret(s,2);guess(s,2);expect(s.scores.b).toBe(2);expect(s.result?.sparksEarned).toBe(2);expect(s.result?.powersUsed).toEqual(['DOUBLE_SPARK']);expect(s.inventory.b).toHaveLength(0)});
 it('Double Spark is consumed for nothing by a wrong guess',()=>{const s=state({inventory:{a:[],b:[{id:'p1',kind:'DOUBLE_SPARK'}]}});engine.usePower(s,'MIND_READER','b','p1');secret(s,2);guess(s,0);expect(s.scores.b).toBe(0);expect(s.result?.powersUsed).toEqual(['DOUBLE_SPARK']);expect(s.inventory.b).toHaveLength(0)});
 it('stacks a Double Spark card with a Double Spark twist',()=>{const s=state({pendingTwists:['DOUBLE_SPARK'],inventory:{a:[],b:[{id:'p1',kind:'DOUBLE_SPARK'}]}});engine.usePower(s,'MIND_READER','b','p1');secret(s,1);guess(s,1);expect(s.scores.b).toBe(4)});
 it('cannot be activated after the result is known, by the wrong player, or on the wrong card',()=>{const s=state({inventory:{a:[{id:'pa',kind:'DOUBLE_SPARK'}],b:[{id:'p1',kind:'DOUBLE_SPARK'}]}});expect(()=>engine.usePower(s,'MIND_READER','a','pa')).toThrow('Only the guesser');expect(()=>engine.usePower(s,'CHEMISTRY','b','p1')).toThrow('Mind Reader');secret(s,0);guess(s,0);expect(()=>engine.usePower(s,'MIND_READER','b','p1')).toThrow('Too late');expect(()=>engine.usePower(s,'MIND_READER','b','nope')).toThrow('not owned')});
 it('Second Chance crosses out a miss and allows one more guess without revealing the answer',()=>{const s=state({inventory:{a:[],b:[{id:'p2',kind:'SECOND_CHANCE'}]}});secret(s,2);engine.usePower(s,'MIND_READER','b','p2');guess(s,0);expect(s.phase).toBe('WAITING_FOR_GUESS');expect(s.firstMiss).toBe(0);expect(s.result).toBeUndefined();expect(s.inventory.b).toHaveLength(0);expect(()=>guess(s,0)).toThrow('crossed out');guess(s,2);expect(s.result).toEqual(expect.objectContaining({correct:true,firstMiss:0,powersUsed:['SECOND_CHANCE']}));expect(s.scores.b).toBe(1)});
 it('Second Chance is kept when the first guess is right',()=>{const s=state({inventory:{a:[],b:[{id:'p2',kind:'SECOND_CHANCE'}]}});secret(s,1);engine.usePower(s,'MIND_READER','b','p2');guess(s,1);expect(s.inventory.b).toEqual([{id:'p2',kind:'SECOND_CHANCE'}])});
 it('Role Reversal swaps roles immediately, once per round, and is consumed',()=>{const s=state({inventory:{a:[{id:'r1',kind:'ROLE_REVERSAL'}],b:[{id:'r2',kind:'ROLE_REVERSAL'},{id:'d',kind:'DOUBLE_SPARK'}]}});engine.usePower(s,'MIND_READER','b','d');engine.usePower(s,'MIND_READER','a','r1');expect(s.secretPlayerId).toBe('b');expect(s.guessingPlayerId).toBe('a');expect(s.twistNotice).toEqual(expect.objectContaining({source:'POWER_CARD',byPlayerId:'a'}));expect(s.inventory.a).toHaveLength(0);expect(s.inventory.b.find((p:any)=>p.id==='d')?.armed).toBeUndefined();expect(()=>engine.usePower(s,'MIND_READER','b','r2')).toThrow('already swapped')});
 it('explains why a card is unavailable',()=>{const s=state({phase:'REVEAL'});expect(engine.powerAvailability(s,'MIND_READER','a',{id:'r',kind:'ROLE_REVERSAL'})).toEqual({usable:false,reason:expect.stringContaining('before the secret')})});
 it('returns armed cards when a round is skipped',()=>{const s=state({inventory:{a:[],b:[{id:'p1',kind:'DOUBLE_SPARK'}]}});engine.usePower(s,'MIND_READER','b','p1');engine.skip(s,'MIND_READER');expect(s.phase).toBe('ROUND_COMPLETE');expect(s.result?.skipped).toBe(true);expect(s.inventory.b[0].armed).toBeUndefined()});
});

describe('heat selection',()=>{
 it('never picks above the agreed heat and favours the limit',()=>{const cards=[1,2,3,4,5].flatMap(h=>Array.from({length:6},(_,i)=>({id:`${h}-${i}`,intensity:h})));for(let i=0;i<20;i++){const ids=engine.pickByHeat(cards,3,5) as string[];expect(ids).toHaveLength(5);expect(ids.every(id=>Number(id[0])<=3)).toBe(true);expect(ids.filter(id=>id[0]==='3').length).toBeGreaterThanOrEqual(3)}});
 it('builds a schedule that opens with Mind Reader and follows every twist with a Mind Reader card',()=>{for(let i=0;i<30;i++){const order=engine.buildSchedule({MIND_READER:['m1','m2','m3','m4','m5'],CHEMISTRY:['c1','c2','c3'],MUTUAL_DESIRE:['d1','d2'],PLOT_TWIST:['t1','t2']}) as string[];expect(order).toHaveLength(12);expect(order[0][0]).toBe('m');const lastMind=Math.max(...order.map((id,j)=>id[0]==='m'?j:-1));expect(order.filter(id=>id[0]==='t').every(id=>order.indexOf(id)<lastMind)).toBe(true)}});
});

describe('legacy sessions',()=>{
 it('normalizes a session persisted before the overhaul',()=>{const s=normalize({phase:'CHEMISTRY_CONFIRM',round:2,version:4,cardIds:[],secretPlayerId:'a',guessingPlayerId:'b',scores:{a:1,b:0},missions:{a:{cardId:'m',status:'ACTIVE'}},inventory:{a:[],b:[]},votes:{},confirmations:{a:true},desires:{},twistAcks:{},activeModifier:'DOUBLE_SPARK'});expect(s.phase).toBe('CHEMISTRY_IN_PROGRESS');expect(s.players).toEqual(['a','b']);expect(s.missions.a).toEqual([{cardId:'m',status:'ACTIVE',notYet:0}]);expect(s.pendingTwists).toEqual(['DOUBLE_SPARK']);expect(s.chemDone).toEqual({a:true})});
});

describe('private state projection',()=>{
 const fixture=(s:InternalState)=>({room:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'r',code:'ABC123',status:'PLAYING',selectedGame:'read-my-mind',expiresAt:new Date(),players:[{id:'a',nickname:'A',isHost:true,connected:true,ready:true,maxHeat:4},{id:'b',nickname:'B',isHost:false,connected:true,ready:true,maxHeat:3}],sessions:[{id:'session',state:s}]})},gameCard:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'mind',type:'MIND_READER',question:'Question?',choices:['One','Two','Three'],intensity:2,artworkPath:'/card.png',challenge:null}),findMany:jest.fn().mockImplementation(({where})=>Promise.resolve(where.id.in.map((id:string)=>({id,question:`Text ${id}`}))))}});
 it('does not expose a secret answer, the partner mission, or the partner inventory before reveal',async()=>{const s=state({phase:'WAITING_FOR_GUESS',secretChoice:2,inventory:{a:[{id:'secret-power',kind:'DOUBLE_SPARK',armed:true}],b:[]}});const view=await new GameEngine(fixture(s) as any).project('r','b');const json=JSON.stringify(view);expect(view.game?.hasSubmittedSecret).toBe(true);expect(view.game?.result).toBeUndefined();expect(json).not.toContain('secretChoice');expect(json).not.toContain('Text ma');expect(json).not.toContain('secret-power');expect(view.game?.mission?.text).toBe('Text mb');expect(view.game?.inventoryCounts.a).toBe(1);expect(view.agreedHeat).toBe(4)});
 it('reveals a partner mission only once it is claimed',async()=>{const s=state();s.missions.a[0].status='DECLARED';const view=await new GameEngine(fixture(s) as any).project('r','b');expect(view.game?.opponentMissionDeclared).toEqual(expect.objectContaining({text:'Text ma',ownerId:'a',number:1,total:2}))});
 it('hides the partner chemistry consent until the viewer answers',async()=>{const s=state({phase:'CHEMISTRY_CONSENT',votes:{a:true}});const db=fixture(s);db.gameCard.findUniqueOrThrow.mockResolvedValue({id:'c',type:'CHEMISTRY',question:'Kiss',choices:['Agree','Decline'],intensity:3,artworkPath:'/x.png',challenge:'Slowly'});const view=await new GameEngine(db as any).project('r','b');expect(view.game?.chemistry).toEqual({stage:'INVITATION',iConsented:false,iFinished:false,partnerFinished:false,sparksEach:1,iReady:false,serverNow:expect.any(String),timerExpired:false});expect(JSON.stringify(view)).not.toContain('"votes"')});
 it('projects power availability with a reason',async()=>{const s=state({inventory:{a:[],b:[{id:'p',kind:'ROLE_REVERSAL'}]},phase:'WAITING_FOR_GUESS',secretChoice:1});const view=await new GameEngine(fixture(s) as any).project('r','b');expect(view.game?.inventory[0]).toEqual(expect.objectContaining({title:'Role Reversal',status:'READY',usable:false,reason:expect.any(String)}))});
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
