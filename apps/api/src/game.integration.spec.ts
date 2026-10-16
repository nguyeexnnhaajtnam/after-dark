import {PrismaService} from './prisma.service';
import {RoomsService} from './rooms.service';
import {GameEngine,RULESET} from './game.engine';

describe('two-player persisted game integration',()=>{
 const db=new PrismaService(),rooms=new RoomsService(db),engine=new GameEngine(db);let roomId='',a='',b='';let actionNo=0;
 const send=async(playerId:string,type:string,extra={})=>{const view=await engine.project(roomId,playerId);await engine.action(roomId,playerId,{actionId:`integration-${Date.now()}-${++actionNo}`,expectedVersion:view.game!.version,round:view.game!.round,type,...extra} as any)};
 beforeAll(async()=>{await db.$connect();const host=await rooms.create('Host');roomId=host.room.id;a=host.credentials.playerId;const guest=await rooms.join(host.room.code,'Guest');b=guest.credentials.playerId;
  await db.roomPlayer.update({where:{id:a},data:{maxHeat:2}});await db.roomPlayer.update({where:{id:b},data:{maxHeat:5}});await db.roomPlayer.updateMany({where:{roomId},data:{ready:true,connected:true}})});
 afterAll(async()=>{if(roomId)await db.room.delete({where:{id:roomId}}).catch(()=>{});await db.$disconnect()});

 it('plays a full 12-card session at the host-set heat with authoritative actions',async()=>{
  await engine.start(roomId,a);const session=await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}});const initial=session.state as any;
  expect(initial.heat).toBe(2);
  const cards=await db.gameCard.findMany({where:{id:{in:[...initial.cardIds,...initial.forfeitIds,...initial.missionDeck[a],...initial.missionDeck[b]]}}});
  // Missions start face down in each player's own deck; nobody holds one until they draw it.
  expect(initial.missions).toEqual({[a]:[],[b]:[]});expect(initial.missionDeck[a].length).toBeGreaterThanOrEqual(2);expect(initial.missionDeck[a].some((id:string)=>initial.missionDeck[b].includes(id))).toBe(false);
  expect(cards.every(c=>c.intensity<=2)).toBe(true);
  const counts=cards.filter(c=>initial.cardIds.includes(c.id)).reduce<Record<string,number>>((out,c)=>(out[c.type]=(out[c.type]||0)+1,out),{});
  expect(counts).toEqual({MIND_READER:5,CHEMISTRY:3,MUTUAL_DESIRE:2,PLOT_TWIST:2});

  // Briefing gates play; both acknowledge at the same version, as two phones would.
  let view=await engine.project(roomId,a);expect(view.game?.phase).toBe('HOW_TO_PLAY');expect(view.agreedHeat).toBe(2);
  // Two languages, one game: the seeded Vietnamese text replaces the English, while the card and its answers stay the same.
  const viView=(await engine.project(roomId,a,'vi')).game!,enView=(await engine.project(roomId,b,'en')).game!;
  expect(viView.card.id).toBe(enView.card.id);expect(viView.version).toBe(enView.version);
  expect(viView.card.question).not.toBe(enView.card.question);expect(viView.card.choices).toHaveLength(enView.card.choices.length);
  expect(viView.draws).toBeUndefined();expect(viView.mission).toBeUndefined();
  await expect(engine.action(roomId,a,{actionId:'early',expectedVersion:view.game!.version,round:1,type:'SUBMIT_SECRET',choice:0})).rejects.toThrow('Finish the briefing');
  view=await engine.project(roomId,a);const v=view.game!.version;
  await Promise.all([engine.action(roomId,a,{actionId:'ack-a',expectedVersion:v,round:1,type:'ACK_HOW_TO_PLAY'}),engine.action(roomId,b,{actionId:'ack-b',expectedVersion:v,round:1,type:'ACK_HOW_TO_PLAY'})]);
  view=await engine.project(roomId,a);expect(view.game?.phase).toBe('WAITING_FOR_SECRET');
  // Each player draws their own mission from a face-down spread; only the spread size was ever sent.
  expect(view.game?.draws?.MISSION).toBe(Math.min(4,initial.missionDeck[a].length));
  await send(a,'DRAW_CARD',{draw:'MISSION',choice:view.game!.draws!.MISSION!-1});await send(b,'DRAW_CARD',{draw:'MISSION',choice:0});
  const viMission=(await engine.project(roomId,a,'vi')).game!.mission!,enMission=(await engine.project(roomId,b,'en')).game!.mission!;
  expect(initial.missionDeck[a]).toContain(viMission.id);expect(initial.missionDeck[b]).toContain(enMission.id);
  const tr=await db.gameCardTranslation.findUniqueOrThrow({where:{cardId_locale:{cardId:viMission.id,locale:'vi'}}});
  const base=await db.gameCard.findUniqueOrThrow({where:{id:enMission.id}});
  expect(viMission.text).toBe(tr.question);expect(enMission.text).toBe(base.question);

  // Stale and duplicate actions are rejected.
  await expect(engine.action(roomId,a,{actionId:'stale',expectedVersion:view.game!.version-1,type:'NEXT_ROUND'})).rejects.toThrow('Stale');
  await expect(engine.action(roomId,a,{actionId:'ack-a',expectedVersion:view.game!.version,type:'NEXT_ROUND'})).rejects.toThrow('Duplicate');

  // A confirmed mission earns a Power Card draw; the drawn card is the visible reward, then the next mission is drawn.
  await send(a,'DECLARE_MISSION');const declared=await engine.project(roomId,b);expect(declared.game?.opponentMissionDeclared?.text).toBeTruthy();
  await send(b,'CONFIRM_MISSION',{missionOwnerId:a,completed:true});
  const owed=await engine.project(roomId,a);expect(owed.game?.inventory).toHaveLength(0);expect(owed.game?.draws).toEqual({MISSION:expect.any(Number),POWER:3});
  await send(a,'DRAW_CARD',{draw:'POWER',choice:1});
  const rewarded=await engine.project(roomId,a);expect(rewarded.game?.inventory).toHaveLength(1);expect(rewarded.game?.lastReward?.powerId).toBe(rewarded.game?.inventory[0].id);
  await send(a,'DRAW_CARD',{draw:'MISSION',choice:0});expect((await engine.project(roomId,a)).game?.mission?.number).toBe(2);

  let correct=0,chemistryDone=0,doubleCards=0,counterCards=0;const questionsByRound:Record<number,Set<string>>={};const sparks=()=>engine.project(roomId,a).then(r=>r.game!.scores);const twistsSeen:string[]=[];
  for(let round=1;round<=12;round++){
   view=await engine.project(roomId,a);const g=view.game!;expect(g.round).toBe(round);
   if(g.card.type==='MIND_READER'){
    // Whatever twist modifies this card, play it to the end: every step is a server phase both phones share.
    const right=round%2===1;if(right&&g.twistNotice?.kind!=='COUNTER_MIND')correct++;if(g.twistNotice)expect(g.twistNotice.kind).toBe(twistsSeen.at(-1));
    if(g.twistNotice?.kind==='DOUBLE_CHALLENGE')doubleCards++;if(g.twistNotice?.kind==='COUNTER_MIND')counterCards++;questionsByRound[round]=new Set();
    for(let step=0;step<20;step++){
     const m=(await engine.project(roomId,a)).game!;if(m.round!==round||m.phase==='GAME_COMPLETE')break;questionsByRound[round].add(m.card.id);
     expect((await engine.project(roomId,b)).game!.phase).toBe(m.phase);
     if(m.phase==='WAITING_FOR_SECRET')await send(m.secretPlayerId,'SUBMIT_SECRET',{choice:1});
     else if(m.phase==='QUESTION_TIME'){for(const p of [a,b])if(m.questions?.[p]?.status==='OPEN')await send(p,'PASS_QUESTION')}
     else if(m.phase==='WAITING_FOR_GUESS'){const guesserView=await engine.project(roomId,m.guessingPlayerId);expect(guesserView.game?.result).toBeUndefined();expect(guesserView.game?.mySecretChoice).toBeUndefined();await send(m.guessingPlayerId,'SUBMIT_GUESS',{choice:right?1:0})}
     else if(m.phase==='COUNTER_MIND_SUBMIT'){await send(a,'SUBMIT_COUNTER_MIND',{choice:1,prediction:right?1:0});expect((await engine.project(roomId,b)).game?.counterMind).toEqual({iSubmitted:false,partnerSubmitted:true});await send(b,'SUBMIT_COUNTER_MIND',{choice:1,prediction:right?1:0})}
     else if(m.phase==='REVEAL'){expect(m.result?.predictions?.every(p=>p.correct===right)).toBe(true);
      if(m.forfeit?.stage==='DRAWING'){await expect(send(a,'NEXT_ROUND')).rejects.toThrow('forfeit');expect(m.forfeit.text).toBe('');expect(m.forfeit.cards).toBeGreaterThan(0);
       await send(m.forfeit.payerId,'DRAW_CARD',{draw:'FORFEIT',choice:m.forfeit.cards!-1});const drawn=(await engine.project(roomId,b)).game!.forfeit!;expect(drawn.stage).toBe('OFFERED');expect(drawn.text).toBeTruthy()}
      else if(m.forfeit?.stage==='OFFERED'){await expect(send(a,'NEXT_ROUND')).rejects.toThrow('forfeit');await send(m.forfeit.payerId,'FORFEIT_VOTE',{accept:false})}
      else await send(a,'NEXT_ROUND')}
    }
    continue;
   }else if(g.card.type==='CHEMISTRY'){
    if(chemistryDone===0){
     const before=await sparks();const cv=g.version;
     await Promise.all([engine.action(roomId,a,{actionId:`chem-a-${round}`,expectedVersion:cv,round,type:'CHEMISTRY_VOTE',accept:true}),engine.action(roomId,b,{actionId:`chem-b-${round}`,expectedVersion:cv,round,type:'CHEMISTRY_VOTE',accept:true})]);
     expect((await engine.project(roomId,b)).game?.chemistry?.stage).toBe('MUTUALLY_ACCEPTED');
     // Both press start at the same version, as two phones would: exactly one clock starts.
     const sv=(await engine.project(roomId,a)).game!.version;
     await Promise.all([engine.action(roomId,a,{actionId:`start-a-${round}`,expectedVersion:sv,round,type:'CHEMISTRY_START'}),engine.action(roomId,b,{actionId:`start-b-${round}`,expectedVersion:sv,round,type:'CHEMISTRY_START'})]);
     const ra=(await engine.project(roomId,a)).game!.chemistry!,rb=(await engine.project(roomId,b)).game!.chemistry!;expect(ra.stage).toBe('IN_PROGRESS');expect(ra.startedAt).toBeTruthy();expect(ra.startedAt).toBe(rb.startedAt);expect(ra.endsAt).toBe(rb.endsAt);
     await send(a,'CHEMISTRY_DONE');
     const waiting=await engine.project(roomId,a);expect(waiting.game?.chemistry?.stage).toBe('WAITING_FOR_COMPLETION');expect((await engine.project(roomId,b)).game?.chemistry?.partnerFinished).toBe(true);
     await send(b,'CHEMISTRY_DONE');const after=await sparks();expect(after[a]).toBe(before[a]+1);expect(after[b]).toBe(before[b]+1);chemistryDone++;
    }else{await send(b,'CHEMISTRY_VOTE',{accept:false});expect((await engine.project(roomId,a)).game?.chemistry?.stage).toBe('DECLINED')}
   }else if(g.card.type==='MUTUAL_DESIRE'){await send(a,'MUTUAL_DESIRE_CHOICE',{desire:'YES'});await send(b,'MUTUAL_DESIRE_CHOICE',{desire:'YES'});expect((await engine.project(roomId,a)).game?.result?.mutualUnlocked).toBe(true)}
   else{const before=await sparks();await send(a,'PLOT_TWIST_ACK');await send(b,'PLOT_TWIST_ACK');twistsSeen.push(g.card.effect!);
    for(const p of [a,b])expect((await engine.project(roomId,p)).game?.pendingTwist).toBe(g.card.effect);
    // A restarted server reads the same pending twist; activating it paid nobody.
    expect((await new GameEngine(db).project(roomId,b)).game?.pendingTwist).toBe(g.card.effect);expect(await sparks()).toEqual(before)}
   await send(a,'NEXT_ROUND');
  }
  const finished=(await engine.project(roomId,a)).game!;expect(finished.phase).toBe('GAME_COMPLETE');expect(finished.round).toBe(12);
  expect(new Set(twistsSeen).size).toBe(2);expect(finished.pendingTwist).toBeUndefined();
  // Exactly one scheduled, unassisted read per Mind Reader card; twist predictions are counted apart.
  const sum=(k:keyof typeof finished.stats[string])=>finished.stats[a][k]+finished.stats[b][k];expect(sum('reads')).toBe(5-counterCards);expect(finished.stats[a].correctReads+finished.stats[b].correctReads).toBe(correct);
  expect(sum('extraReads')).toBe(doubleCards);expect(sum('reciprocalReads')).toBe(2*counterCards);expect(sum('assistedReads')).toBe(0);
  // A Double Challenge card asked two different questions; every other card asked one.
  for(const qs of Object.values(questionsByRound))expect([1,2]).toContain(qs.size);expect(Object.values(questionsByRound).filter(qs=>qs.size===2)).toHaveLength(doubleCards);
  expect(finished.stats[a].chemistryCompleted).toBe(1);expect(finished.stats[a].missionsCompleted).toBe(1);
  await expect(send(a,'NEXT_ROUND')).rejects.toThrow('over');
 },60000);
});

describe('timed Chemistry countdown against the database',()=>{
 const db=new PrismaService(),rooms=new RoomsService(db);let roomId='',a='',b='',n=0;
 const view=(engine:GameEngine,p:string)=>engine.project(roomId,p).then(v=>v.game!);
 const act=async(engine:GameEngine,p:string,type:string,extra={})=>{const g=await view(engine,p);return engine.action(roomId,p,{actionId:`timer-${Date.now()}-${++n}`,expectedVersion:g.version,round:g.round,type,...extra} as any)};
 const patch=async(change:(s:any)=>void)=>{const session=await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}});const s=session.state as any;change(s);await db.gameSession.update({where:{id:session.id},data:{state:s}})};
 beforeAll(async()=>{await db.$connect();const host=await rooms.create('Host');roomId=host.room.id;a=host.credentials.playerId;const guest=await rooms.join(host.room.code,'Guest');b=guest.credentials.playerId;
  await db.roomPlayer.update({where:{id:a},data:{maxHeat:4}});await db.roomPlayer.updateMany({where:{roomId},data:{ready:true,connected:true}})});
 afterAll(async()=>{if(roomId)await db.room.delete({where:{id:roomId}}).catch(()=>{});await db.$disconnect()});

 it('runs one persisted, server-stamped countdown that survives a restart and pays only on mutual confirmation',async()=>{
  const engine=new GameEngine(db);await engine.start(roomId,a);
  const card=await db.gameCard.findUniqueOrThrow({where:{id:'chem-h4-2'}});expect(card.durationSeconds).toBe(60);
  // Put the statue game (60s) on round one, past the briefing.
  await patch(s=>{s.cardIds[0]='chem-h4-2';s.phase='CHEMISTRY_CONSENT'});
  let g=await view(engine,a);expect(g.card.durationSeconds).toBe(60);expect(g.chemistry?.stage).toBe('INVITATION');
  await expect(act(engine,a,'CHEMISTRY_START')).rejects.toThrow('not ready to start');
  const v=g.version;await Promise.all([engine.action(roomId,a,{actionId:'vote-a',expectedVersion:v,round:1,type:'CHEMISTRY_VOTE',accept:true}),engine.action(roomId,b,{actionId:'vote-b',expectedVersion:v,round:1,type:'CHEMISTRY_VOTE',accept:true})]);
  // One ready, one not: no clock yet.
  await act(engine,a,'CHEMISTRY_START');
  expect((await view(engine,a)).chemistry).toEqual(expect.objectContaining({stage:'WAITING_TO_START',iReady:true,durationSeconds:60}));
  expect((await view(engine,b)).chemistry).toEqual(expect.objectContaining({stage:'MUTUALLY_ACCEPTED',iReady:false}));expect((await view(engine,a)).chemistry?.endsAt).toBeUndefined();
  await expect(act(engine,a,'CHEMISTRY_START')).rejects.toThrow('already pressed start');
  // Unauthorized and stale actions are refused.
  await expect(engine.action(roomId,'not-a-player',{actionId:'intruder',expectedVersion:(await view(engine,a)).version,round:1,type:'CHEMISTRY_START'})).rejects.toThrow('not seated');
  await expect(engine.action(roomId,b,{actionId:'stale-next',expectedVersion:(await view(engine,a)).version-1,round:1,type:'NEXT_ROUND'})).rejects.toThrow('Stale');
  const before=Date.now();await act(engine,b,'CHEMISTRY_START');const after=Date.now();
  const ca=(await view(engine,a)).chemistry!,cb=(await view(engine,b)).chemistry!;
  expect(ca.stage).toBe('IN_PROGRESS');expect(ca.endsAt).toBe(cb.endsAt);expect(ca.startedAt).toBe(cb.startedAt);
  const started=Date.parse(ca.startedAt!);expect(started).toBeGreaterThanOrEqual(before-5);expect(started).toBeLessThanOrEqual(after+5);expect(Date.parse(ca.endsAt!)-started).toBe(60000);
  expect(Math.abs(Date.parse(ca.serverNow)-Date.now())).toBeLessThan(5000);expect(ca.timerExpired).toBe(false);
  // Pressing start again, from either side, cannot move the clock.
  await expect(act(engine,b,'CHEMISTRY_START')).rejects.toThrow('not ready to start');expect((await view(engine,a)).chemistry?.endsAt).toBe(ca.endsAt);
  // A fresh engine (a restarted server) reads the same deadline from the database.
  const restarted=new GameEngine(db);expect((await view(restarted,b)).chemistry?.endsAt).toBe(ca.endsAt);expect(await restarted.chemistryDeadline(roomId)).toBe(Date.parse(ca.endsAt!));
  // One confirms; the other still decides.
  const sparks=(await view(restarted,a)).scores;await act(restarted,a,'CHEMISTRY_DONE');
  expect((await view(restarted,a)).chemistry).toEqual(expect.objectContaining({stage:'WAITING_FOR_COMPLETION',iFinished:true}));expect((await view(restarted,b)).chemistry).toEqual(expect.objectContaining({stage:'IN_PROGRESS',partnerFinished:true,endsAt:ca.endsAt}));
  // Time runs out (moved into the past, as if a minute had passed): expired for both, nothing paid, the confirmation kept.
  await patch(s=>{s.chemTimer.startedAt=new Date(Date.now()-61000).toISOString();s.chemTimer.endsAt=new Date(Date.now()-1000).toISOString()});
  const xa=(await view(restarted,a)),xb=(await view(restarted,b));expect(xa.chemistry?.timerExpired).toBe(true);expect(xb.chemistry?.timerExpired).toBe(true);expect(xa.scores).toEqual(sparks);expect(xa.chemistry?.iFinished).toBe(true);expect(xa.phase).toBe('CHEMISTRY_IN_PROGRESS');
  expect(await restarted.chemistryDeadline(roomId)).toBeLessThan(Date.now());
  // Confirming after the deadline still counts, exactly once.
  await act(restarted,b,'CHEMISTRY_DONE');const done=await view(restarted,a);expect(done.chemistry?.stage).toBe('COMPLETED');expect(done.scores[a]).toBe(sparks[a]+1);expect(done.scores[b]).toBe(sparks[b]+1);
  await expect(act(restarted,b,'CHEMISTRY_DONE')).rejects.toThrow('not in progress');expect((await view(restarted,a)).scores).toEqual(done.scores);
  expect(await restarted.chemistryDeadline(roomId)).toBeUndefined();
 },30000);
});

describe('Plot Twists and Power Cards against the database',()=>{
 const db=new PrismaService(),rooms=new RoomsService(db),engine=new GameEngine(db);let roomId='',a='',b='',n=0;
 const view=(p:string)=>engine.project(roomId,p).then(v=>v.game!);
 const act=async(p:string,type:string,extra={})=>{const g=await view(p);return engine.action(roomId,p,{actionId:`power-${Date.now()}-${++n}`,expectedVersion:g.version,round:g.round,type,...extra} as any)};
 const stored=async()=>(await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}})).state as any;
 const patch=async(change:(s:any)=>void)=>{const session=await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}});const s=session.state as any;change(s);await db.gameSession.update({where:{id:session.id},data:{state:s}})};
 beforeAll(async()=>{await db.$connect();const host=await rooms.create('Host');roomId=host.room.id;a=host.credentials.playerId;const guest=await rooms.join(host.room.code,'Guest');b=guest.credentials.playerId;
  await db.roomPlayer.update({where:{id:a},data:{maxHeat:2}});await db.roomPlayer.updateMany({where:{roomId},data:{ready:true,connected:true}})});
 afterAll(async()=>{if(roomId)await db.room.delete({where:{id:roomId}}).catch(()=>{});await db.$disconnect()});

 it('plays Picky Kitty, Let Me In! and A Little Present through persisted, authorized actions without touching the score',async()=>{
  await engine.start(roomId,a);const dealt=[...(await stored()).cardIds];
  await patch(s=>{s.phase='WAITING_FOR_SECRET';s.inventory[a]=[{id:'pk',kind:'PICKY_KITTY'},{id:'lm',kind:'LET_ME_IN'}];s.inventory[b]=[{id:'gift',kind:'A_LITTLE_PRESENT'}]});
  // Not owned, or not yet allowed: refused, and nothing is spent.
  await expect(act(b,'USE_POWER',{powerId:'pk'})).rejects.toThrow('not owned');await expect(act(a,'USE_POWER',{powerId:'lm'})).rejects.toThrow('revealed');
  let g=await view(a);expect(g.inventory.map(p=>p.id)).toEqual(['pk','lm']);expect((await view(b)).inventory.map(p=>p.id)).toEqual(['gift']);
  expect(JSON.stringify(await engine.project(roomId,b))).not.toContain('"pk"');
  // Picky Kitty: three heat-capped questions for the owner only; a replayed action id cannot run twice.
  const v=g.version;await engine.action(roomId,a,{actionId:'picky-once',expectedVersion:v,round:1,type:'USE_POWER',powerId:'pk'});
  await expect(engine.action(roomId,a,{actionId:'picky-once',expectedVersion:v+1,round:1,type:'USE_POWER',powerId:'pk'})).rejects.toThrow('Duplicate');
  g=await view(a);const candidates=g.pickyKitty!.candidates!;expect(candidates).toHaveLength(3);expect(candidates.map(c=>c.id)).not.toContain(dealt[0]);
  const rows=await db.gameCard.findMany({where:{id:{in:candidates.map(c=>c.id)}}});expect(rows).toHaveLength(3);expect(rows.every(r=>r.type==='MIND_READER'&&r.enabled&&r.intensity<=2)).toBe(true);
  expect((await view(b)).pickyKitty).toEqual({ownerId:a});await expect(act(g.secretPlayerId,'SUBMIT_SECRET',{choice:0})).rejects.toThrow('Wait for the question');
  await act(a,'PICK_QUESTION',{cardId:candidates[1].id});
  const [ga,gb]=[await view(a),await view(b)];expect(ga.card.id).toBe(candidates[1].id);expect(gb.card.id).toBe(candidates[1].id);expect(ga.inventory.map(p=>p.id)).toEqual(['lm']);
  const deck=(await stored()).cardIds;expect(deck).toHaveLength(12);expect(new Set(deck).size).toBe(12);
  // Play the picked card, then a asks why b guessed what they did.
  await act(ga.secretPlayerId,'SUBMIT_SECRET',{choice:2});await act(ga.guessingPlayerId,'SUBMIT_GUESS',{choice:2});
  const settled=await view(a);const scores=settled.scores,stats=settled.stats;
  await act(a,'USE_POWER',{powerId:'lm'});expect((await view(b)).followUp).toEqual(expect.objectContaining({askerId:a,responderId:b,choice:2,role:'GUESS',stage:'ASKED'}));
  await expect(act(a,'FOLLOW_UP_REPLY',{accept:true,text:'me'})).rejects.toThrow('Only your partner');
  await act(b,'FOLLOW_UP_REPLY',{accept:true,text:'  Because I know you. '});expect((await view(a)).followUp).toEqual(expect.objectContaining({stage:'ANSWERED',reply:'Because I know you.'}));
  // A Little Present: an off-deck challenge at tonight's heat; a no costs nothing.
  await act(b,'USE_POWER',{powerId:'gift'});const bonusId=(await stored()).bonus.cardId;const bonus=await db.gameCard.findUniqueOrThrow({where:{id:bonusId}});
  expect(bonus.type).toBe('CHEMISTRY');expect(bonus.intensity).toBeLessThanOrEqual(2);expect(deck).not.toContain(bonusId);expect((await view(a)).bonusMoment).toEqual(expect.objectContaining({giverId:b,receiverId:a,stage:'OFFERED',iAnswered:false}));
  await act(a,'BONUS_VOTE',{accept:false});const after=await view(b);expect(after.bonusMoment?.stage).toBe('DECLINED');expect(after.scores).toEqual(scores);expect(after.stats).toEqual(stats);
  expect(after.inventory).toEqual([]);expect((await view(a)).inventory).toEqual([]);
  await act(a,'NEXT_ROUND');const moved=await view(b);expect(moved.round).toBe(2);expect(moved.followUp).toBeUndefined();expect(moved.bonusMoment).toBeUndefined();
 },30000);

 it('runs a Counter Mind twist end to end with simultaneous, sealed submissions',async()=>{
  await engine.start(roomId,a);
  // Round one is the Counter Mind twist card, and a Mind Reader card follows it.
  await patch(s=>{const mind=s.cardIds.slice(1).find((id:string)=>id.startsWith('rmm-'));const i=s.cardIds.indexOf(mind);s.cardIds[i]=s.cardIds[1];s.cardIds[1]=mind;
   const t=s.cardIds.indexOf('twist-04');if(t>=0)s.cardIds[t]=s.cardIds[0];s.cardIds[0]='twist-04';s.phase='PLOT_TWIST'});
  let g=await view(a);expect(g.card.effect).toBe('COUNTER_MIND');
  await Promise.all([engine.action(roomId,a,{actionId:'cm-ack-a',expectedVersion:g.version,round:1,type:'PLOT_TWIST_ACK'}),engine.action(roomId,b,{actionId:'cm-ack-b',expectedVersion:g.version,round:1,type:'PLOT_TWIST_ACK'})]);
  expect((await new GameEngine(db).project(roomId,b)).game?.pendingTwist).toBe('COUNTER_MIND');
  await act(b,'NEXT_ROUND');g=await view(a);expect(g.phase).toBe('COUNTER_MIND_SUBMIT');expect(g.pendingTwist).toBeUndefined();expect(g.twistNotice?.kind).toBe('COUNTER_MIND');
  const v=g.version;await Promise.all([engine.action(roomId,a,{actionId:'cm-a',expectedVersion:v,round:2,type:'SUBMIT_COUNTER_MIND',choice:0,prediction:1}),engine.action(roomId,b,{actionId:'cm-b',expectedVersion:v,round:2,type:'SUBMIT_COUNTER_MIND',choice:1,prediction:2})]);
  const [ra,rb]=[await view(a),await view(b)];expect(ra.phase).toBe('REVEAL');expect(rb.result).toEqual(ra.result);
  expect(ra.result?.predictions?.map(p=>[p.guesserId,p.correct,p.category])).toEqual(expect.arrayContaining([[a,true,'RECIPROCAL'],[b,false,'RECIPROCAL']]));
  expect(ra.scores[a]).toBe(1);expect(ra.scores[b]).toBe(0);for(const p of [a,b])expect(ra.stats[p]).toEqual(expect.objectContaining({reads:0,extraReads:0,reciprocalReads:1}));expect(ra.result?.predictions?.every(x=>x.category==='RECIPROCAL')).toBe(true);
  expect(ra.forfeit?.payerId).toBe(b);
 },30000);
});

describe('state machine, concurrency and older sessions against the database',()=>{
 const db=new PrismaService(),rooms=new RoomsService(db),engine=new GameEngine(db);let roomId='',a='',b='',n=0;
 const view=(p:string,e=engine)=>e.project(roomId,p).then(v=>v.game!);
 const act=async(p:string,type:string,extra={})=>{const g=await view(p);return engine.action(roomId,p,{actionId:`sm-${Date.now()}-${++n}`,expectedVersion:g.version,round:g.round,type,...extra} as any)};
 const stored=async()=>(await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}})).state as any;
 const patch=async(change:(s:any)=>void)=>{const session=await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}});const s=session.state as any;change(s);await db.gameSession.update({where:{id:session.id},data:{state:s}})};
 /** Round one becomes the given twist card (as dealt with `effect`), with a Mind Reader card right after it. */
 const twistFirst=(card:string,effect:string)=>patch(s=>{const mind=s.cardIds.slice(1).find((id:string)=>id.startsWith('rmm-'));const i=s.cardIds.indexOf(mind);s.cardIds[i]=s.cardIds[1];s.cardIds[1]=mind;
  const t=s.cardIds.indexOf(card);if(t>=0)s.cardIds[t]=s.cardIds[0];s.cardIds[0]=card;s.twistEffects={[card]:effect};s.phase='PLOT_TWIST'});
 beforeAll(async()=>{await db.$connect();const host=await rooms.create('Host');roomId=host.room.id;a=host.credentials.playerId;const guest=await rooms.join(host.room.code,'Guest');b=guest.credentials.playerId;
  await db.roomPlayer.update({where:{id:a},data:{maxHeat:2}});await db.roomPlayer.updateMany({where:{roomId},data:{ready:true,connected:true}})});
 afterAll(async()=>{if(roomId)await db.room.delete({where:{id:roomId}}).catch(()=>{});await db.$disconnect()});

 it('plays a Double Challenge on two distinct questions, across a restart between the parts, without touching the deck',async()=>{
  await engine.start(roomId,a);await twistFirst('twist-02','DOUBLE_CHALLENGE');const deck=[...(await stored()).cardIds];expect(deck).toHaveLength(12);
  // Both activate at the same version, as two phones would.
  const g=await view(a);await Promise.all([engine.action(roomId,a,{actionId:'dc-ack-a',expectedVersion:g.version,round:1,type:'PLOT_TWIST_ACK'}),engine.action(roomId,b,{actionId:'dc-ack-b',expectedVersion:g.version,round:1,type:'PLOT_TWIST_ACK'})]);
  await act(a,'NEXT_ROUND');const partA=await view(a);expect(partA.challengePart).toBe(1);expect(partA.card.id).toBe(deck[1]);
  const second=(await stored()).secondCardId;const row=await db.gameCard.findUniqueOrThrow({where:{id:second}});expect(row.type).toBe('MIND_READER');expect(row.intensity).toBeLessThanOrEqual(2);expect(deck).not.toContain(second);
  expect(JSON.stringify(await engine.project(roomId,b))).not.toContain(second);
  await act(partA.secretPlayerId,'SUBMIT_SECRET',{choice:0});await act(partA.guessingPlayerId,'SUBMIT_GUESS',{choice:0});await act(b,'NEXT_ROUND');
  // A restarted server picks up part B with its own question, on both phones.
  const restarted=new GameEngine(db);const [ba,bb]=[await view(a,restarted),await view(b,restarted)];
  expect(ba.challengePart).toBe(2);expect(ba.card.id).toBe(second);expect(bb.card.id).toBe(second);expect(ba.secretPlayerId).toBe(partA.guessingPlayerId);
  await act(ba.secretPlayerId,'SUBMIT_SECRET',{choice:1});await act(ba.guessingPlayerId,'SUBMIT_GUESS',{choice:2});
  const done=await view(b);expect(done.result?.predictions?.map(p=>[p.questionId,p.category])).toEqual([[deck[1],'NORMAL'],[second,'EXTRA']]);expect(done.forfeit?.stage).toBe('DRAWING');
  await act(done.forfeit!.payerId,'FORFEIT_VOTE',{accept:false});await act(a,'NEXT_ROUND');
  const after=await stored();expect(after.round).toBe(3);expect(after.cardIds).toEqual(deck);expect(after.secondCardId).toBeUndefined();expect(after.lastMindSecretId).toBe(partA.secretPlayerId);
 },30000);

 it('applies the effect a twist card was dealt with, never the one stored on the card row now',async()=>{
  await engine.start(roomId,a);
  // The seeded row says DOUBLE_CHALLENGE; this session was dealt it as ROLE_REVERSAL, as if the seed had changed since.
  expect((await db.gameCard.findUniqueOrThrow({where:{id:'twist-02'}})).choices).toEqual(['DOUBLE_CHALLENGE']);
  await twistFirst('twist-02','ROLE_REVERSAL');expect((await view(b)).card.effect).toBe('ROLE_REVERSAL');
  await act(a,'PLOT_TWIST_ACK');await act(b,'PLOT_TWIST_ACK');expect((await stored()).pendingTwist).toBe('ROLE_REVERSAL');
 },30000);

 it('rejects stale, duplicate, unseated and invalid actions without changing the stored game',async()=>{
  await engine.start(roomId,a);await patch(s=>{s.phase='WAITING_FOR_SECRET';s.inventory[a]=[{id:'lm',kind:'LET_ME_IN'}]});
  const g=await view(a);const before=JSON.stringify(await stored());
  await expect(engine.action(roomId,a,{actionId:'sm-stale',expectedVersion:g.version-1,round:1,type:'SUBMIT_SECRET',choice:0})).rejects.toThrow('Stale');
  await expect(engine.action(roomId,'intruder',{actionId:'sm-intruder',expectedVersion:g.version,round:1,type:'SUBMIT_SECRET',choice:0})).rejects.toThrow('not seated');
  await expect(engine.action(roomId,a,{actionId:'sm-early-power',expectedVersion:g.version,round:1,type:'USE_POWER',powerId:'lm'})).rejects.toThrow('revealed');
  await expect(engine.action(roomId,b,{actionId:'sm-not-mine',expectedVersion:g.version,round:1,type:'USE_POWER',powerId:'lm'})).rejects.toThrow('not owned');
  await expect(engine.action(roomId,g.guessingPlayerId,{actionId:'sm-wrong-turn',expectedVersion:g.version,round:1,type:'SUBMIT_SECRET',choice:0})).rejects.toThrow('Not your turn');
  expect(JSON.stringify(await stored())).toBe(before);
  // A rejected action id was never recorded, so a valid retry with it still works once; a second use is a duplicate.
  await engine.action(roomId,g.secretPlayerId,{actionId:'sm-wrong-turn',expectedVersion:g.version,round:1,type:'SUBMIT_SECRET',choice:1});
  await expect(engine.action(roomId,g.secretPlayerId,{actionId:'sm-wrong-turn',expectedVersion:g.version+1,round:1,type:'SUBMIT_SECRET',choice:1})).rejects.toThrow('Duplicate');
 },30000);

 it('moves on while a follow-up or a Bonus Moment is still open, and a late answer is refused',async()=>{
  await engine.start(roomId,a);await patch(s=>{s.phase='WAITING_FOR_SECRET';s.inventory[a]=[{id:'lm',kind:'LET_ME_IN'},{id:'gift',kind:'A_LITTLE_PRESENT'}]});
  const g=await view(a);await act(g.secretPlayerId,'SUBMIT_SECRET',{choice:0});await act(g.guessingPlayerId,'SUBMIT_GUESS',{choice:0});
  await act(a,'USE_POWER',{powerId:'lm'});await act(a,'USE_POWER',{powerId:'gift'});
  const open=await view(b);expect(open.followUp?.stage).toBe('ASKED');expect(open.bonusMoment?.stage).toBe('OFFERED');
  await act(a,'NEXT_ROUND');expect((await view(b)).round).toBe(2);
  // Answers aimed at the closed card, sent with its round number, are refused; so are answers to a follow-up that no longer exists.
  await expect(engine.action(roomId,b,{actionId:'sm-late-reply',expectedVersion:open.version,round:1,type:'FOLLOW_UP_REPLY',accept:true,text:'late'})).rejects.toThrow('Stale');
  await expect(engine.action(roomId,b,{actionId:'sm-late-bonus',expectedVersion:open.version,round:1,type:'BONUS_VOTE',accept:true})).rejects.toThrow('Stale');
  const now=await view(b);await expect(engine.action(roomId,b,{actionId:'sm-late-reply-2',expectedVersion:now.version,round:2,type:'FOLLOW_UP_REPLY',accept:true})).rejects.toThrow();
  const s=await stored();expect(s.followUp).toBeUndefined();expect(s.bonus).toBeUndefined();expect(s.inventory[a]).toEqual([]);
 },30000);

 it('closes a session dealt under older rules instead of reinterpreting its cards, and a new game starts cleanly',async()=>{
  await engine.start(roomId,a);
  // Shaped like a pre-revision session: no ruleset, a retired Double Spark twist pending, retired Power Cards in hand.
  await patch(s=>{delete s.ruleset;delete s.twistEffects;s.phase='WAITING_FOR_SECRET';s.pendingTwists=['DOUBLE_SPARK'];s.inventory[a]=[{id:'old-1',kind:'DOUBLE_SPARK'},{id:'old-2',kind:'SECOND_CHANCE'}]});
  const before=JSON.stringify(await stored());
  for(const p of [a,b]){const v=await view(p,new GameEngine(db));expect(v.outdated).toBe(true);expect(v.inventory).toEqual([])}
  await expect(act(a,'NEXT_ROUND')).rejects.toThrow('older rules');await expect(act(b,'SUBMIT_SECRET',{choice:0})).rejects.toThrow('older rules');
  expect(JSON.stringify(await stored())).toBe(before);
  await engine.start(roomId,a);const fresh=await stored();expect(fresh.ruleset).toBe(RULESET);expect(Object.values(fresh.twistEffects)).toHaveLength(2);expect((await view(a)).outdated).toBeUndefined();
 },30000);
});
