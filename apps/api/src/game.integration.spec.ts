import {PrismaService} from './prisma.service';
import {RoomsService} from './rooms.service';
import {GameEngine} from './game.engine';

describe('two-player persisted game integration',()=>{
 const db=new PrismaService(),rooms=new RoomsService(db),engine=new GameEngine(db);let roomId='',a='',b='';let actionNo=0;
 const send=async(playerId:string,type:string,extra={})=>{const view=await engine.project(roomId,playerId);await engine.action(roomId,playerId,{actionId:`integration-${Date.now()}-${++actionNo}`,expectedVersion:view.game!.version,round:view.game!.round,type,...extra} as any)};
 beforeAll(async()=>{await db.$connect();const host=await rooms.create('Host');roomId=host.room.id;a=host.credentials.playerId;const guest=await rooms.join(host.room.code,'Guest');b=guest.credentials.playerId;
  await db.roomPlayer.update({where:{id:a},data:{maxHeat:2}});await db.roomPlayer.update({where:{id:b},data:{maxHeat:5}});await db.roomPlayer.updateMany({where:{roomId},data:{ready:true,connected:true}})});
 afterAll(async()=>{if(roomId)await db.room.delete({where:{id:roomId}}).catch(()=>{});await db.$disconnect()});

 it('plays a full 12-card session at the host-set heat with authoritative actions',async()=>{
  await engine.start(roomId,a);const session=await db.gameSession.findFirstOrThrow({where:{roomId,status:'ACTIVE'}});const initial=session.state as any;
  expect(initial.heat).toBe(2);
  const cards=await db.gameCard.findMany({where:{id:{in:[...initial.cardIds,...initial.forfeitIds,...initial.missions[a].map((m:any)=>m.cardId)]}}});
  expect(cards.every(c=>c.intensity<=2)).toBe(true);
  const counts=cards.filter(c=>initial.cardIds.includes(c.id)).reduce<Record<string,number>>((out,c)=>(out[c.type]=(out[c.type]||0)+1,out),{});
  expect(counts).toEqual({MIND_READER:5,CHEMISTRY:3,MUTUAL_DESIRE:2,PLOT_TWIST:2});

  // Briefing gates play; both acknowledge at the same version, as two phones would.
  let view=await engine.project(roomId,a);expect(view.game?.phase).toBe('HOW_TO_PLAY');expect(view.agreedHeat).toBe(2);
  // Two languages, one game: the seeded Vietnamese text replaces the English, while the card and its answers stay the same.
  const viView=(await engine.project(roomId,a,'vi')).game!,enView=(await engine.project(roomId,b,'en')).game!;
  expect(viView.card.id).toBe(enView.card.id);expect(viView.version).toBe(enView.version);
  expect(viView.card.question).not.toBe(enView.card.question);expect(viView.card.choices).toHaveLength(enView.card.choices.length);
  const tr=await db.gameCardTranslation.findUniqueOrThrow({where:{cardId_locale:{cardId:viView.mission!.id,locale:'vi'}}});
  const base=await db.gameCard.findUniqueOrThrow({where:{id:enView.mission!.id}});
  expect(viView.mission?.text).toBe(tr.question);expect(enView.mission?.text).toBe(base.question);
  await expect(engine.action(roomId,a,{actionId:'early',expectedVersion:view.game!.version,round:1,type:'SUBMIT_SECRET',choice:0})).rejects.toThrow('Finish the briefing');
  view=await engine.project(roomId,a);const v=view.game!.version;
  await Promise.all([engine.action(roomId,a,{actionId:'ack-a',expectedVersion:v,round:1,type:'ACK_HOW_TO_PLAY'}),engine.action(roomId,b,{actionId:'ack-b',expectedVersion:v,round:1,type:'ACK_HOW_TO_PLAY'})]);
  view=await engine.project(roomId,a);expect(view.game?.phase).toBe('WAITING_FOR_SECRET');

  // Stale and duplicate actions are rejected.
  await expect(engine.action(roomId,a,{actionId:'stale',expectedVersion:view.game!.version-1,type:'NEXT_ROUND'})).rejects.toThrow('Stale');
  await expect(engine.action(roomId,a,{actionId:'ack-a',expectedVersion:view.game!.version,type:'NEXT_ROUND'})).rejects.toThrow('Duplicate');

  // A confirmed mission grants a visible reward.
  await send(a,'DECLARE_MISSION');const declared=await engine.project(roomId,b);expect(declared.game?.opponentMissionDeclared?.text).toBeTruthy();
  await send(b,'CONFIRM_MISSION',{missionOwnerId:a,completed:true});
  const rewarded=await engine.project(roomId,a);expect(rewarded.game?.inventory).toHaveLength(1);expect(rewarded.game?.lastReward?.powerId).toBe(rewarded.game?.inventory[0].id);expect(rewarded.game?.mission?.number).toBe(2);

  let correct=0,chemistryDone=0;const sparks=()=>engine.project(roomId,a).then(r=>r.game!.scores);
  for(let round=1;round<=12;round++){
   view=await engine.project(roomId,a);const g=view.game!;expect(g.round).toBe(round);
   if(g.card.type==='MIND_READER'){
    await send(g.secretPlayerId,'SUBMIT_SECRET',{choice:1});
    const guesserView=await engine.project(roomId,g.guessingPlayerId);expect(guesserView.game?.result).toBeUndefined();
    const right=round%2===1;await send(g.guessingPlayerId,'SUBMIT_GUESS',{choice:right?1:0});
    const after=(await engine.project(roomId,a)).game!;expect(after.result?.correct).toBe(right);
    if(right)correct++;else{expect(after.forfeit?.stage).toBe('OFFERED');await expect(send(a,'NEXT_ROUND')).rejects.toThrow('forfeit');await send(g.guessingPlayerId,'FORFEIT_VOTE',{accept:false});}
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
   else{await send(a,'PLOT_TWIST_ACK');await send(b,'PLOT_TWIST_ACK');expect((await engine.project(roomId,a)).game?.pendingTwists).toContain(g.card.effect)}
   await send(a,'NEXT_ROUND');
  }
  const finished=(await engine.project(roomId,a)).game!;expect(finished.phase).toBe('GAME_COMPLETE');expect(finished.round).toBe(12);
  const totalReads=finished.stats[a].reads+finished.stats[b].reads;expect(totalReads).toBe(5);expect(finished.stats[a].correctReads+finished.stats[b].correctReads).toBe(correct);
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
