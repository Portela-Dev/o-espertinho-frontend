import {test,expect} from './coverage';
test('interação de preço é opcional e preserva faixas ao salvar, testar e recarregar',async({page})=>{
 let version=1,rules:any[]=[{mode:'text',field:'title',selectors:['h1'],required:true},{mode:'text',field:'price',selectors:['.primary'],priceSelection:'first_in_range'},{mode:'text',field:'price',selectors:['#offers > article:first-child .price'],priceSelection:'first_in_range',wholeSelector:'.whole',fractionSelector:'.fraction',priceReveal:{clickSelector:'#show',waitTimeoutMs:8000}}],tested:any;
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'admin',name:'Admin',role:'admin',permissions:['catalog','selectors']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path==='/api/admin/catalog-marketplaces')data=[{id:'shop',name:'Loja',allowed_hosts:['shop.example.com'],scraping_enabled:true}];
  else if(path==='/api/admin/selectors/shop'){
   if(req.method()==='PUT'){rules=req.postDataJSON().rules;version++;data={ok:true,version};}
   else data={version,rules,wait_timeout_ms:15000,validity_minutes:360};
  }else if(path.endsWith('/shop/test')){tested=req.postDataJSON().profile;data={isTest:true,data:{title:'Produto',priceCents:32100,images:[],specifications:[],missing:[],warnings:[],evidence:[],collectedAt:new Date().toISOString()}};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/selectors');const prices=page.locator('.selector-rule'),normal=prices.nth(1),fallback=prices.nth(2);
 const toggle=(panel:any)=>panel.getByRole('checkbox',{name:'Clicar para revelar preço somente se nenhum preço válido for encontrado'});
 await expect(toggle(normal)).not.toBeChecked();await expect(toggle(fallback)).toBeChecked();await expect(fallback.getByLabel('Seletor CSS do botão')).toHaveValue('#show');
 await fallback.getByLabel('Seletor CSS do botão').fill('#show-options');await fallback.getByLabel('Espera após o clique (ms)').fill('1200');
 await page.getByRole('button',{name:'Salvar seletores',exact:true}).click();await expect.poll(()=>version).toBe(2);
 expect(rules[2].priceReveal).toEqual({clickSelector:'#show-options',waitTimeoutMs:1200});expect(rules[1].priceSelection).toBe('first_in_range');
 await page.reload();await expect(fallback.getByLabel('Espera após o clique (ms)')).toHaveValue('1200');
 await page.getByLabel('URL para teste').fill('https://shop.example.com/p');await page.getByRole('button',{name:'Testar extração',exact:true}).click();await expect.poll(()=>tested?.rules[2].priceReveal.clickSelector).toBe('#show-options');
 await toggle(normal).check();await expect(toggle(fallback)).not.toBeChecked();await normal.getByLabel('Seletor CSS do botão').fill('#other');await toggle(normal).uncheck();
 await page.getByRole('button',{name:'Salvar seletores',exact:true}).click();await expect.poll(()=>version).toBe(3);expect(rules.every(rule=>rule.priceReveal===undefined)).toBe(true);
});
