import {test,expect,Page} from './coverage';
async function login(page:Page){
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(options:any){(window as any).testLogin=options.callback;},renderButton(el:HTMLElement){const button=document.createElement('button');button.textContent='Login de teste';button.onclick=()=>(window as any).testLogin({credential:'admin'});el.appendChild(button);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);
}
const config=()=>({intervalMs:2000,timeoutMs:30000,humanTimeoutMs:900000,categorySeparator:'>',blockRules:[],recipe:null});
test('admin configura executor e detecção de bloqueios sem código por marketplace',async({page})=>{
 let saved:any;
 await page.route('**/api/admin/extension-catalog/settings/**',route=>{
  if(route.request().method()==='PUT'){saved=route.request().postDataJSON();return route.fulfill({json:{version:1,config:saved.config}});}
  return route.fulfill({json:{id:'amazon',catalog_executor:'legacy',version:0,config:config()}});
 });
 await login(page);await page.goto('/admin/marketplaces');
 const panel=page.locator('extension-catalog-settings').first();await panel.locator('summary').click();
 await panel.getByRole('combobox',{name:'Executor',exact:true}).selectOption('extension');await panel.getByLabel('Intervalo entre consultas (ms)').fill('1500');
 await panel.getByRole('button',{name:'Adicionar regra'}).click();await panel.getByRole('combobox',{name:'Estado',exact:true}).selectOption('challenge');await panel.getByLabel('Valor',{exact:true}).fill('.human-check');
 await panel.getByRole('button',{name:'Salvar configuração da extensão'}).click();await expect.poll(()=>saved?.executor).toBe('extension');expect(saved.config.intervalMs).toBe(1500);expect(saved.config.blockRules[0].kind).toBe('challenge');expect(saved.config.recipe).toBeNull();
});
test('acompanhamento tem paginação, menu flutuante, detalhes e cancelamento',async({page})=>{
 const id='129b21da-af3b-4d7c-970e-d3a38a350ffe';let cancelled=false;
 await page.route('**/api/admin/extension-catalog/runs**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/cancel')){cancelled=true;return route.fulfill({json:{ok:true}});}
  if(url.pathname.endsWith('/items'))return route.fulfill({json:{items:[{id,status:'failed',error:'incomplete'}],total:1,page:1,pageSize:20}});
  return route.fulfill({json:{items:[{id,marketplace_name:'Loja de teste',step:'prices',status:cancelled?'cancelled':'waiting_for_human',reason:'challenge',total:3,completed:1,failed:0,updated_at:new Date().toISOString()}],total:1,page:1,pageSize:20}});
 });
 await login(page);await page.goto('/admin/updates');const component=page.locator('catalog-operations');await expect(component).toContainText('Intervenção necessária');await component.getByRole('button',{name:'Ações ⋮'}).click();await component.getByRole('button',{name:'Detalhar',exact:true}).click();await expect(component).toContainText('incomplete');
 await component.getByRole('button',{name:'Ações ⋮'}).click();await component.getByRole('button',{name:'Cancelar',exact:true}).click();await expect.poll(()=>cancelled).toBe(true);await expect(component).toContainText('Cancelado');
 await expect(component.locator('app-pagination')).toHaveCount(2);
});
test('teste de seletor aguarda resultado da extensão e não cadastra anúncio',async({page})=>{
 const id='129b21da-af3b-4d7c-970e-d3a38a350ffe';let polls=0;
 await page.route('**/api/admin/selectors/*/test',route=>route.fulfill({status:202,json:{executionId:id,status:'queued'}}));
 await page.route('**/api/admin/extension-catalog/manual/'+id,route=>{
  polls++;if(polls===1)return route.fulfill({json:{executionId:id,status:'queued'}});
  return route.fulfill({json:{executionId:id,status:'completed',isTest:true,canConfirm:false,marketplaceName:'Loja de teste',affiliateUrl:'https://shop.example.com/p',data:{title:'Produto pela extensão',description:'Descrição',priceCents:12345,originalPriceCents:null,images:[],missing:[],warnings:[],evidence:[],specifications:[],conditions:'',category:'',productUrl:'https://shop.example.com/p',collectedAt:new Date().toISOString()}}});
 });
 await login(page);await page.goto('/admin/selectors');await page.getByLabel('URL para teste',{exact:true}).fill('https://www.amazon.com.br/product/test');await page.getByRole('button',{name:'Testar extração',exact:true}).click();await expect(page.getByText('Aguardando extração pela extensão.',{exact:false})).toBeVisible();await expect(page.getByText('Produto pela extensão',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Confirmar cadastro'})).toHaveCount(0);
});
