import {test,expect,type Page} from '@playwright/test';
import {copy,drawFromSheet,escape,localeContext,oneOf,type Copy,type Locale} from './i18n';

const noHorizontalOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
const category=async(page:Page)=>(await page.locator('article[data-card-type]').getAttribute('data-card-type'))!;
// Event animations run up to ~1.2s; E2E_SETTLE_MS lets a review run capture their settled state instead of a mid-reveal frame.
const SETTLE=Number(process.env.E2E_SETTLE_MS||0);
const shot=async(page:Page,name:string)=>{if(SETTLE)await page.waitForTimeout(SETTLE);await page.screenshot({path:test.info().outputPath(`${name}.png`)})};
/** The way on from a settled card: a draw for its drawer, or the results after the last card. */
const advanceButton=(page:Page,c:Copy)=>page.getByRole('button',{name:oneOf(c.m.actions.drawNext,c.m.actions.drawDone,c.m.actions.results,c.m.actions.doneResults)});
const lockGuess=(page:Page,c:Copy)=>page.getByRole('button',{name:new RegExp(`^${escape(c.prefix(c.m.actions.lockGuess))}`)});
const lockIt=(page:Page,c:Copy)=>page.getByRole('button',{name:c.m.actions.lockIt,exact:true});
const revealIndex=(page:Page,attr:'secret'|'guess')=>page.locator('article li').evaluateAll((items,a)=>items.findIndex(li=>li.hasAttribute(`data-${a}`)),attr);

// Two phones, two languages, one game: every label below is read from that player's own catalog.
const PAIRS:Array<[Locale,Locale]>=[['vi','en'],['en','vi']];
for(const [hostLocale,guestLocale] of PAIRS){
test(`full Read My Mind session · host ${hostLocale}, guest ${guestLocale}`,async({browser,browserName})=>{
 const H=copy(hostLocale),G=copy(guestLocale);
 const permissions=browserName==='chromium'?['clipboard-read','clipboard-write']:[];
 const hc=await localeContext(browser,hostLocale,{permissions}),gc=await localeContext(browser,guestLocale),host=await hc.newPage(),guest=await gc.newPage();
 const C=new Map<Page,Copy>([[host,H],[guest,G]]);const c=(p:Page)=>C.get(p)!;

 // Create, then verify the copy actions really reach the clipboard.
 await host.goto('/room/create');await expect(host.locator('html')).toHaveAttribute('lang',hostLocale==='vi'?'vi-VN':'en-US');
 await host.getByPlaceholder(H.m.room.nicknamePlaceholder).fill('Scarlet');await host.getByRole('button',{name:H.m.room.create.action}).click();
 const code=(await host.getByTestId('room-code').innerText()).trim();expect(code).toMatch(/^[A-Z0-9]{6}$/);
 await host.getByRole('button',{name:H.m.invite.copyCode}).click();await expect(host.getByRole('button',{name:H.m.invite.copied})).toBeVisible();
 if(permissions.length)expect(await host.evaluate(()=>navigator.clipboard.readText())).toBe(code);
 await host.getByRole('button',{name:H.m.invite.copyLink}).click();
 const invite=permissions.length?await host.evaluate(()=>navigator.clipboard.readText()):`/room/join?code=${code}`;expect(invite).toContain(`/room/join?code=${code}`);

 // The invite link pre-fills the code for the guest.
 await guest.goto(invite.replace(/^https?:\/\/[^/]+/,''));await expect(guest.getByPlaceholder('ABC123')).toHaveValue(code);
 await guest.getByPlaceholder(G.m.room.nicknamePlaceholder).fill('Midnight');await guest.getByRole('button',{name:G.m.room.join.action}).click();
 await expect(host.getByText(H.m.lobby.partnerJoined)).toBeVisible();await expect(guest.getByText(G.m.lobby.partnerJoined)).toBeVisible();

 // Game picker: Coming Soon games cannot be selected, and the guest cannot change the game.
 await host.getByRole('radio',{name:/Dare Me/}).click({force:true});await expect(host.getByRole('alert').filter({hasText:H.f(H.m.lobby.noteComingSoon,{game:'Dare Me'})})).toBeVisible();
 await expect(host.getByRole('radio',{name:/Read My Mind/})).toHaveAttribute('aria-checked','true');
 await guest.getByRole('radio',{name:/No Secrets/}).click({force:true});await expect(guest.getByRole('alert').filter({hasText:G.m.errors.action.hostOnlyGame})).toBeVisible();

 // Heat: only the host sets it; the guest sees the same level, named in their own language, read-only.
 const heat=(p:Page)=>p.locator('section[aria-labelledby="heat-title"]');
 await heat(host).getByRole('radio',{name:H.m.heat.labels[3]}).click();await expect(heat(guest).getByRole('radio',{name:G.m.heat.labels[3]})).toHaveAttribute('aria-checked','true');
 await expect(heat(guest).getByRole('radio',{name:G.m.heat.labels[3]})).toHaveAttribute('aria-disabled','true');await heat(guest).getByRole('radio',{name:G.m.heat.labels[0]}).click({force:true});
 await expect(heat(host).getByRole('radio',{name:H.m.heat.labels[3]})).toHaveAttribute('aria-checked','true');await expect(guest.locator('#heat-selected')).toContainText(G.f(G.m.heat.setBy,{name:'Scarlet'}));
 await shot(host,'lobby');await shot(guest,'lobby-guest');await noHorizontalOverflow(host);await noHorizontalOverflow(guest);

 // Lobby hierarchy: the host never readies, and Deal stays locked until the guest is in; the guest never gets a Deal button.
 await expect(host.getByRole('button',{name:H.m.lobby.start})).toBeDisabled();await expect(guest.getByRole('button',{name:G.m.lobby.start})).toHaveCount(0);
 await expect(host.getByRole('button',{name:H.m.lobby.imIn})).toHaveCount(0);await expect(host.getByText(H.f(H.m.lobby.notePartnerWarming,{name:'Midnight'}))).toBeVisible();
 await guest.getByRole('button',{name:G.m.lobby.imIn}).click();await expect(guest.getByText(G.f(G.m.lobby.waitGuest,{host:'Scarlet'}))).toBeVisible();
 await shot(guest,'lobby-guest-ready');await expect(host.getByRole('button',{name:H.m.lobby.start})).toBeEnabled();
 await host.getByRole('button',{name:H.m.lobby.start}).click();

 // The briefing is reading, not a gate: the host draws the first card from it in one tap; the guest only reads and waits.
 await expect(host.getByText(H.m.onboarding.label)).toBeVisible();await expect(guest.getByText(G.m.onboarding.label)).toBeVisible();await shot(host,'onboarding');await shot(guest,'onboarding-guest');
 await expect(guest.getByText(G.f(G.m.actions.waitDrawFirst,{name:'Scarlet'}))).toBeVisible();await expect(guest.getByRole('button',{name:G.m.actions.drawFirst})).toHaveCount(0);
 await host.getByRole('button',{name:H.m.actions.drawFirst}).click();
 // Both phones see the same card turn over, and the first answer is open at once: no Continue, Ready or Start in between.
 await expect(host.locator('article[data-card-type]')).toBeVisible();await expect(guest.locator('article[data-card-type]')).toBeVisible();
 expect(await category(host)).toBe('MIND_READER');await expect(lockIt(host,H)).toBeVisible();
 // Each player draws their own mission face down; neither phone ever shows the other's.
 const hostMission=await drawFromSheet(host,H,'mission');const guestMission=await drawFromSheet(guest,G,'mission');await shot(host,'mission-drawn');
 await expect(guest.getByText(hostMission.split('\n').at(-1)!)).toHaveCount(0);await expect(host.getByText(guestMission.split('\n').at(-1)!)).toHaveCount(0);

 // Secret Mission: claim → partner sees it → confirm → reward reveal → Power Card in the HUD.
 const missionChip=(p:Page)=>p.getByRole('button',{name:new RegExp(`^${escape(c(p).m.hud.mission)}`)});
 await missionChip(host).click();await host.getByRole('button',{name:H.m.hud.reveal}).click();await shot(host,'mission-open');
 await host.getByRole('button',{name:H.m.hud.ask}).click();
 // The claim waits on the partner's HUD instead of covering their card.
 await expect(guest.getByRole('dialog')).toHaveCount(0);await guest.getByRole('button',{name:G.f(G.m.hud.verdictChip,{name:'Scarlet'})}).click();
 const verdict=guest.getByRole('dialog');await expect(verdict.getByText(G.m.verdict.title)).toBeVisible();await shot(guest,'mission-verdict');
 await verdict.getByRole('button',{name:G.m.verdict.yes}).click();
 // The confirmed mission earns a Power Card draw, then the next mission is drawn the same way.
 await drawFromSheet(host,H,'power');await shot(host,'reward');
 await expect(host.getByRole('button',{name:new RegExp(`^${escape(H.f(H.m.hud.powerAria,{count:1,limit:2}))}`)})).toBeVisible();
 await drawFromSheet(host,H,'mission');
 await missionChip(host).click();

 /** Who draws next takes turns (host draws odd cards); the partner sees who is drawing. Returns the clicks it took: one. */
 const nick=(p:Page)=>p===host?'Scarlet':'Midnight';const clicksPerTransition:number[]=[];
 const advance=async(round:number)=>{
  if(round===3){// A reload while a draw is pending: both phones come back to the same drawer and the same waiting partner.
   await host.reload();await expect(host.getByText(H.f(H.m.hud.round,{round}),{exact:false}).first()).toBeVisible()}
  let drawer:Page|null=null;await expect.poll(async()=>{drawer=await advanceButton(host,H).isVisible()?host:await advanceButton(guest,G).isVisible()?guest:null;return !!drawer},{timeout:10000}).toBe(true);
  const d=drawer!,w=d===host?guest:host;
  // Results are open to either phone; a draw only to its drawer, while the partner watches.
  if(round<12){await expect(advanceButton(w,c(w))).toHaveCount(0);expect(d).toBe((round+1)%2===1?host:guest);await expect(w.getByText(c(w).f(c(w).m.actions.waitDraw,{name:nick(d)}))).toBeVisible()}
  await advanceButton(d,c(d)).click();clicksPerTransition.push(1);
  if(round<12)for(const p of [host,guest])await expect(p.getByText(c(p).f(c(p).m.hud.round,{round:round+1}),{exact:false}).first()).toBeVisible();
 };
 /** The first real decision of a freshly drawn card is open without any further tap. */
 const firstMove=(kind:string)=>kind==='MIND_READER'?host.getByRole('button',{name:oneOf(H.m.actions.lockIt,H.m.actions.sealBoth)}).or(guest.getByRole('button',{name:oneOf(G.m.actions.lockIt,G.m.actions.sealBoth)}))
  :kind==='CHEMISTRY'?host.getByRole('button',{name:H.m.actions.into}):kind==='MUTUAL_DESIRE'?host.getByRole('button',{name:H.m.actions.seal}):host.getByRole('button',{name:H.m.actions.activate});
 const seen=new Set<string>();let chemistryRounds=0,stopChecked=false,timerChecked=false,usedPower=false,forfeitSeen=false,forfeitDrawn=false,switched=false,askedQuestion=false;
 for(let round=1;round<=12;round++){
  for(const p of [host,guest])await expect(p.getByText(c(p).f(c(p).m.hud.round,{round}),{exact:false}).first()).toBeVisible();
  const kind=await category(host);seen.add(kind);expect(await category(guest)).toBe(kind);
  await expect(firstMove(kind).first()).toBeVisible();await expect(advanceButton(host,H)).toHaveCount(0);await expect(advanceButton(guest,G)).toHaveCount(0);
  if(kind==='MIND_READER'){
   // Same card, same answers, in two languages.
   expect(await host.locator('[role=radiogroup] [role=radio]').count()).toBe(await guest.locator('[role=radiogroup] [role=radio]').count());
   // Miss until a forfeit has shown up (round 1 is always a plain Mind Reader card), then alternate by round.
   const right=forfeitSeen&&round%2===1;
   const btn=(p:Page,label:string)=>p.getByRole('button',{name:label,exact:true});
   const marks='article li[data-secret], article li[data-prediction]';
   /** Clicks an action and waits for the server's answer to replace it. */
   const tap=async(p:Page,label:string)=>{await btn(p,label).click();await expect(btn(p,label)).toBeHidden();await p.waitForTimeout(150)};
   // The host plays the Power Card their mission earned at its first legal moment: Picky Kitty before the lock, the others after a reveal.
   const playPower=async()=>{
    if(!switched||usedPower||!await host.getByRole('button',{name:new RegExp(escape(H.suffix(H.m.hud.powerAriaUsable)))}).isVisible())return false;
    await host.getByRole('button',{name:new RegExp(`^${escape(H.prefix(H.m.hud.powerAria))}`)}).click();const tray=host.getByRole('dialog');
    await tray.getByRole('button',{name:H.m.powers.use}).first().click();await shot(host,'power-confirm');
    await tray.getByRole('button',{name:oneOf(...Object.values(H.m.powers.kinds).map(k=>k.useNow))}).click();usedPower=true;
    await expect(host.getByRole('dialog')).toHaveCount(0);await host.waitForTimeout(150);return true};
   // Every step is a server phase both phones share: act on whatever each phone offers until the card is revealed and settled.
   for(let step=0;step<80;step++){
    let acted=false;
    for(const p of [host,guest]){const g=c(p),m=g.m;
     // Picky Kitty: the owner takes the first of the three questions.
     if(await btn(p,m.actions.pickThis).isVisible()){await shot(p,'picky-kitty');await p.getByRole('radio').first().click();await tap(p,m.actions.pickThis);acted=true;break}
     // Counter Mind: both answer A and predict A, sealed separately.
     if(await btn(p,m.actions.sealBoth).isVisible()){const groups=p.locator('[role=radiogroup]');await groups.nth(0).getByRole('radio').first().click();await groups.nth(1).getByRole('radio').first().click();await shot(p,'counter-mind');await tap(p,m.actions.sealBoth);acted=true;break}
     // One More Question: the host asks, the guest answers on the card and passes on asking.
     if(await btn(p,m.card.question.yes).isVisible()){await shot(p,'question-incoming');await tap(p,m.card.question.yes);acted=true;break}
     if(await btn(p,m.actions.noQuestion).isVisible()){
      if(p===host&&!askedQuestion){askedQuestion=true;await p.getByPlaceholder(g.f(m.card.question.placeholder,{name:'Midnight'})).fill('Is it the first one?');await tap(p,m.actions.ask)}
      else await tap(p,m.actions.noQuestion);
      acted=true;break}
     // Let Me In! and A Little Present: the partner passes, which costs nothing.
     if(await btn(p,m.card.followUp.tell).isVisible()){await shot(p,'let-me-in');await tap(p,m.card.followUp.pass);acted=true;break}
     if(await btn(p,m.card.bonus.accept).isVisible()){await shot(p,'little-present');await tap(p,m.card.bonus.decline);acted=true;break}
    }
    if(acted)continue;
    const holder=await lockIt(host,H).isVisible()?host:await lockIt(guest,G).isVisible()?guest:null;
    if(holder){
     if(await playPower())continue;
     const chooser=holder,gss=holder===host?guest:host;
     await chooser.getByRole('radio').first().click();
     if(!switched){
      // Switching language mid-round keeps the pick, the round and the connection, and only changes this phone.
      switched=true;const other=c(chooser).locale==='vi'?'en':'vi',back=copy(other);
      const before=(await chooser.locator('.game-card-title').textContent())!,partnerBefore=(await gss.locator('.game-card-title').textContent())!;
      await chooser.getByRole('button',{name:c(chooser).f(c(chooser).m.lang.switchTo,{language:c(chooser).m.lang[other]})}).first().click();
      await expect(chooser.locator('.game-card-title')).not.toHaveText(before);await expect(chooser.locator('html')).toHaveAttribute('lang',other==='vi'?'vi-VN':'en-US');
      await expect(chooser.getByRole('radio').first()).toHaveAttribute('aria-checked','true');await expect(lockIt(chooser,back)).toBeEnabled();
      await expect(chooser.getByText(back.f(back.m.hud.round,{round}),{exact:false}).first()).toBeVisible();
      await expect(chooser.getByRole('status',{name:back.m.connection.statusConnected})).toBeVisible();
      await expect(gss.locator('.game-card-title')).toHaveText(partnerBefore);await shot(chooser,'switched-language');
      await chooser.getByRole('button',{name:back.f(back.m.lang.switchTo,{language:back.m.lang[c(chooser).locale]})}).first().click();
      await expect(chooser.locator('.game-card-title')).toHaveText(before);await expect(chooser.getByRole('radio').first()).toHaveAttribute('aria-checked','true');
     }
     await lockIt(chooser,c(chooser)).click();await expect(lockIt(chooser,c(chooser))).toBeHidden();continue;
    }
    const guesser=await lockGuess(host,H).isVisible()?host:await lockGuess(guest,G).isVisible()?guest:null;
    if(guesser){await guesser.getByRole('radio').nth(right?0:1).click();if(round===1)await shot(guesser,'mind-reader-guess');await lockGuess(guesser,c(guesser)).click();await expect(lockGuess(guesser,c(guesser))).toBeHidden();continue}
    // Reveal, once both phones show it.
    if(!(await host.locator(marks).count())||!(await guest.locator(marks).count())){await host.waitForTimeout(200);continue}
    // The first forfeit is drawn face down by the player who missed; both phones see the drawn card turn over.
    if(!forfeitDrawn){const payer=await host.getByText(H.m.actions.noteDrawForfeit).isVisible()?host:await guest.getByText(G.m.actions.noteDrawForfeit).isVisible()?guest:null;
     if(payer){const other=payer===host?guest:host;await payer.locator('article .draw-card').first().click();
      await expect(payer.locator('article .draw-reveal-front')).toBeVisible();await expect(other.locator('article .draw-reveal-front')).toBeVisible();
      expect((await payer.locator('article .draw-reveal-front').innerText()).trim()).not.toBe('');forfeitDrawn=true;await shot(payer,'forfeit-drawn');continue}}
    const collector=await btn(host,H.m.actions.letItSlide).isVisible()?host:await btn(guest,G.m.actions.letItSlide).isVisible()?guest:null;
    if(collector){forfeitSeen=true;await shot(collector,'forfeit');await tap(collector,c(collector).m.actions.letItSlide);continue}
    // Double Challenge: part A's reveal leads into part B on the same card.
    if(await btn(host,H.m.actions.partB).isVisible()){await shot(host,'double-challenge-a');await btn(host,H.m.actions.partB).click();await expect(host.locator(marks)).toHaveCount(0);await expect(guest.locator(marks)).toHaveCount(0);continue}
    if(await playPower())continue;
    // Settled: both phones mark the same answers, whatever the language.
    if(await host.locator('article li[data-secret]').count()){await expect(guest.locator('article li[data-secret]')).toHaveCount(1);expect(await revealIndex(host,'secret')).toBe(await revealIndex(guest,'secret'));expect(await revealIndex(host,'guess')).toBe(await revealIndex(guest,'guess'))}
    else{await expect(host.locator('article li[data-prediction]')).toHaveCount(2);await expect(guest.locator('article li[data-prediction]')).toHaveCount(2)}
    break;
   }
  }else if(kind==='CHEMISTRY'){
   chemistryRounds++;
   // The first Chemistry card, and the first timed one, are played through; any others are declined.
   const timed=await host.getByText(new RegExp(`^${escape(H.prefix(H.m.card.chem.timer.chip))}`)).count()>0;
   if(chemistryRounds===1||(timed&&!timerChecked)){
    // Taking part is the start: one yes waits with no clock, the second yes begins the challenge on both phones at once.
    await shot(host,'chemistry-invitation');await host.getByRole('button',{name:H.m.actions.into}).click();await expect(host.getByText(H.f(H.m.actions.waitConsent,{name:'Midnight'})).first()).toBeVisible();
    await expect(host.getByRole('timer')).toHaveCount(0);await expect(host.getByRole('button',{name:H.m.actions.start})).toHaveCount(0);
    await guest.getByRole('button',{name:G.m.actions.into}).click();
    await expect(host.getByRole('button',{name:H.m.actions.didIt})).toBeVisible();await expect(guest.getByRole('button',{name:G.m.actions.didIt})).toBeVisible();await expect(guest.getByRole('button',{name:G.m.actions.start})).toHaveCount(0);await expect(host.getByRole('button',{name:H.m.actions.stop})).toBeVisible();
    if(timed){
     // One server deadline: both phones show the same time, and a reload picks the clock up where it was instead of restarting it.
     const read=async(p:Page)=>{const tm=p.getByRole('timer');await expect(tm).toBeVisible();const [m,s]=(await tm.textContent())!.trim().split(':').map(Number);return m*60+s};
     const [h0,g0]=await Promise.all([read(host),read(guest)]);expect(Math.abs(h0-g0)).toBeLessThanOrEqual(1);await shot(host,'chemistry-countdown');
     await guest.reload();const g1=await read(guest);expect(g1).toBeLessThanOrEqual(g0);
     if(g1>2){await expect.poll(()=>read(host),{timeout:5000}).toBeLessThan(h0)}
     else await expect(host.getByText(H.m.card.chem.timer.expired)).toBeVisible({timeout:8000});
     timerChecked=true;
    }
    await shot(host,'chemistry-in-progress');await shot(guest,'chemistry-in-progress-guest');
    await host.getByRole('button',{name:H.m.actions.didIt}).click();await expect(host.getByText(H.f(H.m.actions.waitCompletion,{name:'Midnight'})).first()).toBeVisible();
    await guest.getByRole('button',{name:G.m.actions.didIt}).click();await expect(host.getByText(H.f(H.m.card.chem.phase.COMPLETED.description,{count:1}))).toBeVisible();await expect(host.getByRole('timer')).toHaveCount(0);await shot(host,'chemistry-complete');
   }else if(!stopChecked){
    // Either of you can stop a running challenge: nothing is paid, nothing is lost.
    await host.getByRole('button',{name:H.m.actions.into}).click();await guest.getByRole('button',{name:G.m.actions.into}).click();await expect(guest.getByRole('button',{name:G.m.actions.stop})).toBeVisible();
    await guest.getByRole('button',{name:G.m.actions.stop}).click();await expect(host.getByText(H.m.card.chem.stoppedNote)).toBeVisible();stopChecked=true;
   }else{await guest.getByRole('button',{name:G.m.actions.notTonight}).click();await expect(host.getByText(H.m.card.chem.declinedNote)).toBeVisible()}
  }else if(kind==='MUTUAL_DESIRE'){
   for(const p of [host,guest]){await p.getByRole('radio',{name:c(p).m.card.desire.YES,exact:true}).click();await p.getByRole('button',{name:c(p).m.actions.seal}).click()}
   await expect(host.getByText(H.m.card.desire.yesNote)).toBeVisible();await expect(guest.getByText(G.m.card.desire.yesNote)).toBeVisible();
  }else{
   await shot(host,'plot-twist');await shot(guest,'plot-twist-guest');await host.getByRole('button',{name:H.m.actions.activate}).click();await guest.getByRole('button',{name:G.m.actions.activate}).click();
   await expect(host.getByText(H.m.card.twist.activated).first()).toBeVisible();await expect(guest.getByText(G.m.card.twist.activated).first()).toBeVisible();
  }
  await noHorizontalOverflow(host);await noHorizontalOverflow(guest);
  // Reconnect keeps the guest's language.
  if(round===2){await guest.reload();await expect(guest.getByText(G.f(G.m.hud.round,{round}),{exact:false}).first()).toBeVisible()}
  await advance(round);
 }
 // From a settled card to the next card's first real decision: exactly one tap, the draw, every time.
 expect(clicksPerTransition).toHaveLength(12);expect(clicksPerTransition.every(n=>n===1)).toBe(true);test.info().annotations.push({type:'clicks',description:`one draw per transition (${clicksPerTransition.length} transitions)`});
 expect([...seen]).toEqual(expect.arrayContaining(['MIND_READER','CHEMISTRY','MUTUAL_DESIRE','PLOT_TWIST']));
 expect(forfeitSeen).toBe(true);expect(forfeitDrawn).toBe(true);
 await expect(host.getByText(H.prefix(H.m.results.eyebrow),{exact:false})).toBeVisible();await shot(host,'results');await shot(guest,'results-guest');
 await host.getByRole('button',{name:H.m.results.hostAction}).click();await expect(guest.getByRole('button',{name:G.m.lobby.imIn})).toBeVisible();
 await hc.close();await gc.close();
});
}
