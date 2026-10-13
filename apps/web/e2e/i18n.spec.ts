import {test,expect,type Page} from '@playwright/test';
import {copy,localeContext,LOCALE_COOKIE} from './i18n';

const VI=copy('vi'),EN=copy('en');

test('a first-time visitor sees Vietnamese, can switch to English, and keeps it after a reload',async({browser})=>{
 const context=await localeContext(browser,null),page=await context.newPage();
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('lang','vi-VN');
 await expect(page).toHaveTitle(VI.m.meta.title);
 await expect(page.getByRole('link',{name:VI.m.title.start})).toBeVisible();await expect(page.getByText(VI.m.title.tagline)).toBeVisible();
 // The age gate is translated too.
 await expect(page.getByRole('dialog')).toContainText(VI.m.age.title);await page.getByRole('button',{name:VI.m.age.confirm}).click();
 await page.getByRole('radio',{name:EN.m.lang.en}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en-US');await expect(page.getByRole('link',{name:EN.m.title.start})).toBeVisible();
 expect((await context.cookies()).find(c=>c.name===LOCALE_COOKIE)?.value).toBe('en');
 expect(await page.evaluate(k=>localStorage.getItem(k),LOCALE_COOKIE)).toBe('en');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en-US');await expect(page).toHaveTitle(EN.m.meta.title);await expect(page.getByRole('link',{name:EN.m.title.start})).toBeVisible();
 // A cleared cookie falls back to the stored preference.
 await context.clearCookies();await page.reload();await expect(page.getByRole('link',{name:EN.m.title.start})).toBeVisible();
 await page.getByRole('radio',{name:VI.m.lang.vi}).click();await expect(page.getByRole('link',{name:VI.m.title.start})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('title-vi.png')});
 await context.close();
});

test('all five games are listed in Vietnamese with their brand names intact',async({browser})=>{
 const context=await localeContext(browser,'vi'),page=await context.newPage();
 await page.goto('/games');await expect(page.getByRole('heading',{name:VI.m.gameSelect.title})).toBeVisible();
 const items=VI.m.catalog.items;const titles={'read-my-mind':'Read My Mind','dare-me':'Dare Me','no-secrets':'No Secrets','take-control':'Take Control','lucky-tonight':'Lucky Tonight'} as const;
 for(const [id,title] of Object.entries(titles)){
  await page.getByRole('tab',{name:title}).click();
  await expect(page.getByRole('heading',{name:title,level:2})).toBeVisible();await expect(page.getByText(items[id as keyof typeof items].tagline)).toBeVisible();
  await expect(page.getByText(items[id as keyof typeof items].duration)).toBeVisible();
  if(id!=='read-my-mind')await expect(page.getByRole('button',{name:VI.m.common.comingSoon})).toBeDisabled();
 }
 await page.screenshot({path:test.info().outputPath('games-vi.png')});
 await page.goto('/games/read-my-mind');await expect(page.getByRole('heading',{name:'Read My Mind',level:1})).toBeVisible();
 for(const rule of items['read-my-mind'].rules)await expect(page.getByText(rule)).toBeVisible();
 await page.screenshot({path:test.info().outputPath('detail-vi.png'),fullPage:true});
 await context.close();
});

test('server errors are shown in the player’s language, never as raw English',async({browser})=>{
 for(const C of [VI,EN]){
  const context=await localeContext(browser,C.locale),page=await context.newPage();
  await page.goto('/room/join');await page.getByPlaceholder('ABC123').fill('ZZZZZ9');await page.getByPlaceholder(C.m.room.nicknamePlaceholder).fill('Tester');
  await page.getByRole('button',{name:C.m.room.join.action}).click();
  const alert=page.getByRole('alert').filter({hasText:C.m.errors.invalidCode.title});await expect(alert).toBeVisible();
  await expect(alert).not.toContainText('Room code not found');
  await page.goto('/room/not-a-room');await expect(page.getByRole('heading',{name:C.m.errors.private.title})).toBeVisible();
  await context.close();
 }
});

/**
 * Per glyph, the element's own font stack must measure exactly like the brand Vietnamese face, and that face must really
 * contain the glyph: then every mark comes from the brand design, never a fallback. (Glyph by glyph, so kerning can't skew it.)
 */
async function glyphsFromBrandFont(page:Page,selector:string,faceVar:string){
 return page.evaluate(async ([sel,face])=>{
  await document.fonts.ready;const style=getComputedStyle(document.querySelector(sel)!);
  const vi=`'${face}'`;
  // Only glyphs that live in the Vietnamese subset; Latin letters come from the Latin face of the same family.
  const sample=[...'ĐẾỞỮẶỳđơưỏẹ'];await document.fonts.load(`${style.fontWeight} 40px ${vi}`,sample.join(''));
  const ctx=document.createElement('canvas').getContext('2d')!;const width=(font:string,ch:string)=>{ctx.font=`${style.fontWeight} 40px ${font}`;return ctx.measureText(ch).width};
  // A glyph the face lacks falls through to the next family, so two different fallbacks measure differently.
  const brand=`${vi}, monospace`;
  return {family:style.fontFamily,fallbacks:sample.filter(ch=>Math.abs(width(style.fontFamily,ch)-width(brand,ch))>.5),missing:sample.filter(ch=>Math.abs(width(brand,ch)-width(`${vi}, serif`,ch))>.5)};
 },[selector,faceVar] as const);
}

test('Vietnamese diacritics render in the brand fonts and are not clipped',async({browser})=>{
 const context=await localeContext(browser,'vi',{viewport:{width:375,height:740}}),page=await context.newPage();
 await page.goto('/room/create');
 for(const [selector,face] of [['h1.display','AD Display'],['label span','AD Sans']] as const){
  const m=await glyphsFromBrandFont(page,selector,face);
  expect(m.fallbacks,`${selector} renders Vietnamese in the brand face (${m.family})`).toEqual([]);
  expect(m.missing,`${selector} brand face has the glyphs loaded`).toEqual([]);
 }
 // Display headings keep room above capitals for stacked marks.
 const lineHeight=await page.locator('h1.display').evaluate(el=>parseFloat(getComputedStyle(el).lineHeight)/parseFloat(getComputedStyle(el).fontSize));
 expect(lineHeight).toBeGreaterThanOrEqual(1.1);
 await page.screenshot({path:test.info().outputPath('create-vi.png')});
 await context.close();
});
