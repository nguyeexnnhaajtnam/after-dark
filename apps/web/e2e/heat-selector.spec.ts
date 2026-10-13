import {test,expect,type Browser,type Page} from '@playwright/test';
import {copy,localeContext,RUN_LOCALES,seatPlayers,type Locale} from './i18n';

const VIEWPORTS=[{name:'320',width:320,height:568},{name:'375',width:375,height:667},{name:'390',width:390,height:844},{name:'430',width:430,height:932},{name:'tablet',width:820,height:1180},{name:'desktop',width:1440,height:900}];

async function soloRoom(browser:Browser,locale:Locale,viewport:{width:number;height:number},reducedMotion:'reduce'|'no-preference'='no-preference'){
 const C=copy(locale);const hc=await localeContext(browser,locale,{viewport,reducedMotion});const host=await hc.newPage();
 await host.goto('/room/create');await host.getByPlaceholder(C.m.room.nicknamePlaceholder).fill('Scarlet');await host.getByRole('button',{name:C.m.room.create.action}).click();
 await host.getByTestId('room-code').waitFor();
 return {host,C,close:()=>hc.close()};
}
const group=(p:Page,locale:Locale)=>p.getByRole('radiogroup',{name:copy(locale).m.lobby.heatTitle});
const thumbOnStop=async(p:Page,label:string)=>{await expect.poll(async()=>p.evaluate(l=>{const stop=[...document.querySelectorAll('section[aria-labelledby=heat-title] [role=radio]')].find(b=>b.textContent===l)!.querySelector('.heat-dot')!.getBoundingClientRect();const t=document.querySelector('.heat-thumb')!.getBoundingClientRect();return Math.round(Math.abs((t.left+t.width/2)-(stop.left+stop.width/2)))},label)).toBeLessThanOrEqual(1)};

for(const locale of RUN_LOCALES)for(const vp of VIEWPORTS){
 test(`Rising Heat selector layout at ${vp.name} (${vp.width}px) · ${locale}`,async({browser})=>{
  const {host,C,close}=await soloRoom(browser,locale,vp);const LEVELS=C.m.heat.labels;
  const g=group(host,locale);await g.scrollIntoViewIfNeeded();
  await expect(g.getByRole('radio')).toHaveCount(5);
  for(const l of LEVELS)await expect(g.getByRole('radio',{name:l})).toBeVisible();
  const m=await host.evaluate(()=>{const stops=[...document.querySelectorAll('section[aria-labelledby=heat-title] [role=radio]')];const labels=stops.map(s=>s.lastElementChild!.getBoundingClientRect());
   return {hOverflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...stops.map(s=>{const r=s.getBoundingClientRect();return Math.min(r.width,r.height)})),labelsInView:labels.every(r=>r.left>=0&&r.right<=innerWidth),labelsOverlap:labels.some((r,i)=>i>0&&r.left<labels[i-1].right)}});
  expect(m.hOverflow,'no horizontal scroll').toBe(false);
  expect(m.minTarget,'touch target ≥ 44px').toBeGreaterThanOrEqual(44);
  expect(m.labelsInView,'labels inside the viewport').toBe(true);
  expect(m.labelsOverlap,'labels do not collide').toBe(false);
  await expect(g.getByRole('radio',{name:LEVELS[2]})).toHaveAttribute('aria-checked','true');await thumbOnStop(host,LEVELS[2]);
  await g.getByRole('radio',{name:LEVELS[4]}).click();await expect(g.getByRole('radio',{name:LEVELS[4]})).toHaveAttribute('aria-checked','true');await thumbOnStop(host,LEVELS[4]);
  await host.locator('section[aria-labelledby="heat-title"]').screenshot({path:test.info().outputPath(`heat-${vp.name}-${locale}-wild.png`)});
  await g.getByRole('radio',{name:LEVELS[0]}).click();await thumbOnStop(host,LEVELS[0]);
  await host.locator('section[aria-labelledby="heat-title"]').screenshot({path:test.info().outputPath(`heat-${vp.name}-${locale}-sweet.png`)});
  await close();
 });
}

test('Rising Heat is host-only, resets the guest, and supports keyboard control · host vi, guest en',async({browser})=>{
 const {host,guest,H,G,close}=await seatPlayers(browser,{host:'vi',guest:'en',viewport:{width:390,height:844}});const g=group(host,'vi'),gg=group(guest,'en');const HL=H.m.heat.labels,GL=G.m.heat.labels;
 await guest.getByRole('button',{name:G.m.lobby.imIn}).click();
 await expect(host.getByRole('button',{name:H.m.lobby.start})).toBeEnabled();
 // Click: the host's pick becomes tonight's heat, the guest sees it in English, and the guest is back to warming up.
 await g.getByRole('radio',{name:HL[3]}).click();
 await expect(g.getByRole('radio',{name:HL[3]})).toHaveAttribute('aria-checked','true');
 await expect(host.locator('#heat-selected')).toContainText(H.m.heat.hints[3]);
 await expect(gg.getByRole('radio',{name:GL[3]})).toHaveAttribute('aria-checked','true');await expect(guest.locator('#heat-selected')).toContainText(G.f(G.m.heat.setBy,{name:'Scarlet'}));
 await expect(guest.getByRole('button',{name:G.m.lobby.imIn})).toBeVisible();await expect(host.getByRole('button',{name:H.m.lobby.start})).toBeDisabled();
 // The guest cannot change it, by click or keyboard.
 await gg.getByRole('radio',{name:GL[0]}).click({force:true});await gg.getByRole('radio',{name:GL[3]}).focus();await guest.keyboard.press('ArrowRight');
 await expect(gg.getByRole('radio',{name:GL[3]})).toHaveAttribute('aria-checked','true');await expect(g.getByRole('radio',{name:HL[3]})).toHaveAttribute('aria-checked','true');
 // Keyboard: roving focus, arrows move and select, Home/End jump.
 await g.getByRole('radio',{name:HL[3]}).focus();await host.keyboard.press('ArrowRight');
 await expect(g.getByRole('radio',{name:HL[4]})).toHaveAttribute('aria-checked','true');await expect(g.getByRole('radio',{name:HL[4]})).toBeFocused();
 await host.keyboard.press('Home');await expect(g.getByRole('radio',{name:HL[0]})).toHaveAttribute('aria-checked','true');await expect(gg.getByRole('radio',{name:GL[0]})).toHaveAttribute('aria-checked','true');
 await host.keyboard.press('End');await expect(g.getByRole('radio',{name:HL[4]})).toHaveAttribute('aria-checked','true');
 await expect(g.getByRole('radio',{name:HL[4]})).toHaveAttribute('tabindex','0');await expect(g.getByRole('radio',{name:HL[2]})).toHaveAttribute('tabindex','-1');
 // Server-persisted: survives a reload, still in Vietnamese.
 await host.reload();await expect(group(host,'vi').getByRole('radio',{name:HL[4]})).toHaveAttribute('aria-checked','true');
 await close();
});

test('Rising Heat respects reduced motion',async({browser})=>{
 const {host,close}=await soloRoom(browser,'vi',{width:390,height:844},'reduce');
 const duration=await host.locator('.heat-thumb').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration));
 expect(duration).toBeLessThan(.01);await close();
});
