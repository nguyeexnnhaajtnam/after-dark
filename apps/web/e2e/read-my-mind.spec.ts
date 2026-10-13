import {test,expect,type Page} from '@playwright/test';
import {copy,escape,localeContext,oneOf,type Copy,type Locale} from './i18n';

const noHorizontalOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
const category=async(page:Page)=>(await page.locator('article[data-card-type]').getAttribute('data-card-type'))!;
// Event animations run up to ~1.2s; E2E_SETTLE_MS lets a review run capture their settled state instead of a mid-reveal frame.
const SETTLE=Number(process.env.E2E_SETTLE_MS||0);
const shot=async(page:Page,name:string)=>{if(SETTLE)await page.waitForTimeout(SETTLE);await page.screenshot({path:test.info().outputPath(`${name}.png`)})};
const nextButton=(page:Page,c:Copy)=>page.getByRole('button',{name:oneOf(c.m.actions.next,c.m.actions.results,c.m.actions.doneNext,c.m.actions.doneResults)});
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

 // Briefing gates the first card until both are in.
 await expect(host.getByText(H.m.onboarding.label)).toBeVisible();await shot(host,'onboarding');
 await host.getByRole('button',{name:H.m.onboarding.skip}).click();await host.getByRole('button',{name:H.m.onboarding.deal}).click();
 await expect(host.getByText(H.f(H.m.onboarding.doneBody,{name:'Midnight'}))).toBeVisible();
 await guest.getByRole('button',{name:G.m.onboarding.skip}).click();await guest.getByRole('button',{name:G.m.onboarding.deal}).click();
 await expect(host.locator('article[data-card-type]')).toBeVisible();

 // Secret Mission: claim → partner sees it → confirm → reward reveal → Power Card in the HUD.
 const missionChip=(p:Page)=>p.getByRole('button',{name:new RegExp(`^${escape(c(p).m.hud.mission)}`)});
 await missionChip(host).click();await host.getByRole('button',{name:H.m.hud.reveal}).click();await shot(host,'mission-open');
 await host.getByRole('button',{name:H.m.hud.ask}).click();
 const verdict=guest.getByRole('dialog');await expect(verdict.getByText(G.m.verdict.title)).toBeVisible();await shot(guest,'mission-verdict');
 await verdict.getByRole('button',{name:G.m.verdict.yes}).click();
 const reward=host.getByRole('dialog');await expect(reward.getByText(H.m.reward.title)).toBeVisible();await shot(host,'reward');
 await reward.getByRole('button',{name:H.m.reward.keepPlaying}).click();await expect(host.getByRole('button',{name:new RegExp(`^${escape(H.f(H.m.hud.powerAria,{count:1,limit:2}))}`)})).toBeVisible();
 await missionChip(host).click();

 const seen=new Set<string>();let chemistryRounds=0,timerChecked=false,usedPower=false,forfeitSeen=false,switched=false;
 for(let round=1;round<=12;round++){
  for(const p of [host,guest])await expect(p.getByText(c(p).f(c(p).m.hud.round,{round}),{exact:false}).first()).toBeVisible();
  const kind=await category(host);seen.add(kind);expect(await category(guest)).toBe(kind);
  if(kind==='MIND_READER'){
   // Same card, same answers, in two languages.
   expect(await host.locator('[role=radiogroup] [role=radio]').count()).toBe(await guest.locator('[role=radiogroup] [role=radio]').count());
   const hostGuesses=!await lockIt(host,H).isVisible();
   if(!usedPower&&hostGuesses&&await host.getByRole('button',{name:new RegExp(escape(H.suffix(H.m.hud.powerAriaUsable)))}).isVisible()){
    await host.getByRole('button',{name:new RegExp(`^${escape(H.prefix(H.m.hud.powerAria))}`)}).click();const tray=host.getByRole('dialog');
    await tray.getByRole('button',{name:H.m.powers.use}).first().click();await shot(host,'power-confirm');
    await tray.getByRole('button',{name:oneOf(...Object.values(H.m.powers.kinds).map(k=>k.useNow))}).click();usedPower=true;
    await expect(host.getByRole('dialog')).toHaveCount(0);
   }
   const roleNow=await lockIt(host,H).isVisible();const chooser=roleNow?host:guest,gss=roleNow?guest:host;
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
   await lockIt(chooser,c(chooser)).click();
   await expect(lockGuess(gss,c(gss))).toBeVisible();
   const right=round%2===1;await gss.getByRole('radio').nth(right?0:1).click();if(round===1)await shot(gss,'mind-reader-guess');await lockGuess(gss,c(gss)).click();
   // A Second Chance can keep the guesser on the card after a miss; take the next open answer.
   const g=c(gss),revealed=gss.getByRole('button',{name:oneOf(g.m.actions.next,g.m.actions.results,g.m.actions.payUp)}),secondChance=gss.getByText(g.m.actions.noteSecondChance);
   await expect(revealed.or(secondChance)).toBeVisible();
   if(await secondChance.isVisible()){await shot(gss,'second-chance');await gss.locator('[role=radio]:not([disabled]):not([aria-checked=true])').first().click();await lockGuess(gss,g).click();await expect(revealed).toBeVisible()}
   // Both phones mark the same answers, whatever the language.
   await expect(chooser.locator('article li[data-secret]')).toHaveCount(1);
   expect(await revealIndex(chooser,'secret')).toBe(await revealIndex(gss,'secret'));expect(await revealIndex(chooser,'guess')).toBe(await revealIndex(gss,'guess'));
   if(await gss.getByRole('button',{name:g.m.actions.pass,exact:true}).isVisible()){forfeitSeen=true;await shot(gss,'forfeit');await gss.getByRole('button',{name:g.m.actions.pass,exact:true}).click()}
  }else if(kind==='CHEMISTRY'){
   chemistryRounds++;
   // The first Chemistry card, and the first timed one, are played through; any others are declined.
   const timed=await host.getByText(new RegExp(`^${escape(H.prefix(H.m.card.chem.timer.chip))}`)).count()>0;
   if(chemistryRounds===1||(timed&&!timerChecked)){
    await shot(host,'chemistry-invitation');await host.getByRole('button',{name:H.m.actions.into}).click();await expect(host.getByText(H.f(H.m.actions.waitConsent,{name:'Midnight'})).first()).toBeVisible();
    await guest.getByRole('button',{name:G.m.actions.into}).click();await expect(host.getByText(H.m.card.chem.phase.READY.title)).toBeVisible();
    // Start needs both: the first press waits, and no clock runs yet.
    await host.getByRole('button',{name:H.m.actions.start}).click();await expect(host.getByText(H.f(H.m.actions.waitStart,{name:'Midnight'})).first()).toBeVisible();
    await expect(host.getByRole('timer')).toHaveCount(0);await expect(guest.getByRole('button',{name:G.m.actions.start})).toBeVisible();
    await guest.getByRole('button',{name:G.m.actions.start}).click();
    await expect(host.getByRole('button',{name:H.m.actions.didIt})).toBeVisible();await expect(host.getByRole('button',{name:H.m.actions.stop})).toBeVisible();
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
  await nextButton(host,H).click();
 }
 expect([...seen]).toEqual(expect.arrayContaining(['MIND_READER','CHEMISTRY','MUTUAL_DESIRE','PLOT_TWIST']));
 expect(forfeitSeen).toBe(true);
 await expect(host.getByText(H.prefix(H.m.results.eyebrow),{exact:false})).toBeVisible();await shot(host,'results');await shot(guest,'results-guest');
 await host.getByRole('button',{name:H.m.results.hostAction}).click();await expect(guest.getByRole('button',{name:G.m.lobby.imIn})).toBeVisible();
 await hc.close();await gc.close();
});
}
