import {test,expect} from './coverage';

test('visão geral mostra cliques do período e estoque publicado por marketplace em resumos independentes',async({page})=>{
 await page.route('https://example.test/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>'}));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let data:any=[];
  if(url.pathname==='/api/auth/session')data={user:{id:'admin',name:'Admin',email:'admin@example.test',role:'admin',permissions:['metrics']},autoSignInAllowed:false};
  else if(url.pathname==='/api/config')data={googleClientId:''};
  else if(url.pathname==='/api/admin/stats')data={days:Number(url.searchParams.get('days')),totalClicks:5,offers:[{status:'published',count:5}],marketplaces:[{id:'amazon',name:'Amazon',logo_url:'https://example.test/a.png',clicks:url.searchParams.get('days')==='7'?1:4,publishedOffers:2},{id:'mercadolivre',name:'Mercado Livre',clicks:1,publishedOffers:3},{id:'zero',name:'Loja sem movimento',clicks:0,publishedOffers:0}],top:[],topTotal:0,topPage:1,topPageSize:5};
  await route.fulfill({json:data});
 });
 await page.goto('/admin');
 const clicks=page.getByRole('region',{name:'Cliques por marketplace',exact:true}),published=page.getByRole('region',{name:'Ofertas publicadas por marketplace',exact:true});
 await expect(clicks.locator('.metric-row')).toHaveCount(3);await expect(published.locator('.metric-row')).toHaveCount(3);
 await expect(clicks.locator('.metric-row').first()).toContainText('Amazon');await expect(clicks.locator('.metric-row').first().locator('strong')).toHaveText('4');
 await expect(published.locator('.metric-row').first()).toContainText('Mercado Livre');await expect(published.locator('.metric-row').first().locator('strong')).toHaveText('3');
 await expect(published.locator('.metric-row').filter({hasText:'Loja sem movimento'}).locator('strong')).toHaveText('0');
 await expect(clicks.locator('marketplace-logo')).toHaveCount(3);await expect(published).toContainText('independente do período');
 await page.getByRole('combobox',{name:'Período',exact:true}).selectOption({label:'Últimos 7 dias'});
 await expect(clicks).toContainText('Nos últimos 7 dias');await expect(clicks.locator('.metric-row').filter({hasText:'Amazon'}).locator('strong')).toHaveText('1');
 await expect(published.locator('.metric-row').filter({hasText:'Amazon'}).locator('strong')).toHaveText('2');
 await page.setViewportSize({width:390,height:844});await expect(published.getByRole('heading')).toBeVisible();
});
