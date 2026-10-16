import {test,expect,type Page} from '@playwright/test';
import {dealIn,escape,oneOf,RUN_LOCALES,seatPlayers} from './i18n';

const VIEWPORTS=[{name:'320',width:320,height:568},{name:'375',width:375,height:667},{name:'390',width:390,height:844},{name:'430',width:430,height:932},{name:'tablet',width:820,height:1180},{name:'desktop',width:1440,height:900},{name:'landscape',width:740,height:360}];

async function assertLayout(page:Page){
 const m=await page.evaluate(()=>{const footer=document.querySelector('main footer'),scroller=footer?.previousElementSibling as HTMLElement|null;const buttons=[...(footer?.querySelectorAll('button')||[])].map(b=>b.getBoundingClientRect());
  const titles=[...document.querySelectorAll('.game-card-title')].map(t=>({over:t.scrollWidth>t.clientWidth+1}));
  // A label box that clips its text (ellipsis or overflow) would cut Vietnamese diacritics or words.
  const clipped=[...document.querySelectorAll('.cta-label')].filter(l=>{const r=l.getBoundingClientRect();return r.width>0&&(l.scrollWidth>l.clientWidth+1||l.scrollHeight>l.clientHeight+1)}).map(l=>l.textContent);
  return {hOverflow:document.documentElement.scrollWidth>window.innerWidth,footerTop:footer?.getBoundingClientRect().top??0,scrollBottom:scroller?.getBoundingClientRect().bottom??0,buttonsInView:buttons.every(r=>r.bottom<=window.innerHeight+1&&r.right<=window.innerWidth+1&&r.left>=-1),titleOverflow:titles.some(t=>t.over),clipped}});
 expect(m.hOverflow,'no horizontal page scroll').toBe(false);
 expect(m.scrollBottom,'card area ends above the action bar').toBeLessThanOrEqual(m.footerTop+1);
 expect(m.buttonsInView,'every action button is reachable').toBe(true);
 expect(m.titleOverflow,'card titles wrap inside the card').toBe(false);
 expect(m.clipped,'no button label is cut off').toEqual([]);
}

for(const locale of RUN_LOCALES)for(const vp of VIEWPORTS){
 test(`layout holds at ${vp.name} (${vp.width}×${vp.height}) · ${locale}`,async({browser})=>{
  const seat=await seatPlayers(browser,{host:locale,guest:locale,viewport:vp,guestName:'A very long nickname here',hostOptions:{hasTouch:vp.width<800}});
  const {host,guest,H,close}=seat;
  await assertLayout(host);await host.screenshot({path:test.info().outputPath(`lobby-${vp.name}-${locale}.png`),fullPage:false});
  await dealIn(seat);
  // First card is always Mind Reader: check both the hiding and the guessing view, then a reveal.
  const chooser=await host.getByRole('button',{name:H.m.actions.lockIt,exact:true}).isVisible()?host:guest,guesser=chooser===host?guest:host;
  await assertLayout(chooser);await chooser.screenshot({path:test.info().outputPath(`mind-hide-${vp.name}-${locale}.png`)});
  await chooser.getByRole('radio').nth(2).click();await chooser.getByRole('button',{name:H.m.actions.lockIt,exact:true}).click();
  const lockGuess=guesser.getByRole('button',{name:new RegExp(`^${escape(H.prefix(H.m.actions.lockGuess))}`)});
  await expect(lockGuess).toBeVisible();await guesser.getByRole('radio').first().click();
  await assertLayout(guesser);await guesser.screenshot({path:test.info().outputPath(`mind-guess-${vp.name}-${locale}.png`)});
  await lockGuess.click();
  await expect(guesser.getByRole('button',{name:oneOf(H.m.actions.next,H.m.actions.payUp,H.m.actions.pass)})).toBeVisible();await assertLayout(guesser);await guesser.screenshot({path:test.info().outputPath(`mind-reveal-${vp.name}-${locale}.png`)});
  await close();
 });
}
