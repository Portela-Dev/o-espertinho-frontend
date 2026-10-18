import {test as base,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

export const test=base.extend<{browserCoverage:void}>({
 browserCoverage:[async({page},use)=>{
  if(!process.env['COLLECT_BROWSER_COVERAGE']){await use();return;}
  await page.coverage.startJSCoverage({resetOnNavigation:false});
  try{await use();}
  finally{
   const entries=await page.coverage.stopJSCoverage();
   await mkdir('coverage/browser-raw',{recursive:true});
   await writeFile(`coverage/browser-raw/${randomUUID()}.json`,JSON.stringify(entries));
  }
 },{auto:true}],
});
export {expect};
export type {Page,BrowserContext} from '@playwright/test';
