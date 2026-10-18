import {test,expect,Page} from './coverage';
async function login(page:Page){
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).__googleLogin=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Entrar para paginação';b.onclick=()=>{(window as any).__googleLogin({credential:'admin'});};el.appendChild(b);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Entrar para paginação'}).click();await expect(page).not.toHaveURL(/entrar/);
}
const product=(i:number)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),name:'Produto paginado '+i,brand:'Marca',model:'',description:'Descrição',category:'Teste',subcategory:'',category_path:['Teste'],category_ids:[],display_image_url:null,min_price_cents:1000,max_price_cents:1000,offer_count:1});
test('vitrine acrescenta lotes pela rolagem, mantém itens no erro e termina sem duplicação',async({page})=>{
 const calls:number[]=[];let fail=true;
 await page.route('**/api/products?**',async route=>{const u=new URL(route.request().url()),p=Number(u.searchParams.get('page')||1);calls.push(p);if(p===2&&fail){fail=false;await route.fulfill({status:503,json:{error:'Teste'}});return;}await route.fulfill({json:{items:Array.from({length:p===3?4:24},(_,i)=>product((p-1)*24+i+1)),page:p,pageSize:24,total:52}});});
 await page.goto('/');await expect(page.locator('product-card')).toHaveCount(24);
 await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('app-infinite-scroll [role=alert]')).toBeVisible();await expect(page.locator('product-card')).toHaveCount(24);
 await page.locator('app-infinite-scroll').getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('product-card')).toHaveCount(48);
 await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('product-card')).toHaveCount(52);await expect(page.locator('app-infinite-scroll button')).toHaveCount(0);
 expect(calls).toEqual([1,2,2,3]);expect(await page.locator('product-card h3').allTextContents()).toHaveLength(52);
});
test('nova busca descarta respostas antigas e reinicia a rolagem',async({page})=>{
 let releaseOld!:()=>void,oldStarted!:()=>void;
 const oldGate=new Promise<void>(resolve=>{releaseOld=resolve;}),started=new Promise<void>(resolve=>{oldStarted=resolve;});
 await page.route('**/api/products?**',async route=>{const u=new URL(route.request().url()),q=u.searchParams.get('q')||'';if(q==='antiga'){oldStarted();await oldGate;}await route.fulfill({json:{items:[{...product(1),name:q||'Inicial'}],page:1,pageSize:24,total:1}});});
 await page.goto('/');await expect(page.locator('product-card h3')).toHaveText('Inicial');
 await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('antiga');await page.locator('.search-bar button').click();await started;
 await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('nova');await page.locator('.search-bar button').click();await expect(page.locator('product-card h3')).toHaveText('nova');
 const oldResponse=page.waitForResponse(response=>new URL(response.url()).searchParams.get('q')==='antiga');releaseOld();await (await oldResponse).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));await expect(page.locator('product-card h3')).toHaveText('nova');
});
test('catálogos e filtros salvos usam rolagem infinita e reiniciam ao navegar',async({page})=>{
 await login(page);
 for(const kind of ['collections','filters'])await page.route('**/api/me/'+kind+'?**',async route=>{const p=Number(new URL(route.request().url()).searchParams.get('page'));await route.fulfill({json:{items:Array.from({length:p===1?20:3},(_,i)=>({id:kind+'-'+((p-1)*20+i),name:'Registro '+((p-1)*20+i),description:'Teste',item_count:0,filters:{q:'Teste'}})),total:23,page:p,pageSize:20}});});
 for(const [path,selector] of [['/catalogos','.collection-card'],['/filtros','.saved-filter-card']]){
  await page.goto(path);await expect(page.locator(selector)).toHaveCount(20);await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator(selector)).toHaveCount(23);
 }
});
test('tabelas administrativas mostram apenas a página solicitada e respeitam início e fim',async({page})=>{
 await login(page);
 await page.route('**/api/admin/products?**',async route=>{const u=new URL(route.request().url()),p=Number(u.searchParams.get('page'));await route.fulfill({json:{items:Array.from({length:p===1?20:1},(_,i)=>({...product((p-1)*20+i+1),sku:'ESP_TEST',link_count:0,available_count:0})),total:21,page:p,pageSize:20}});});
 await page.goto('/admin/products');const pager=page.getByRole('navigation',{name:'Produtos',exact:true});await expect(page.locator('products-admin tbody tr')).toHaveCount(20);await expect(pager.getByRole('button',{name:'Anterior'})).toBeDisabled();await pager.getByRole('button',{name:'Próxima'}).click();await expect(page.locator('products-admin tbody tr')).toHaveCount(1);await expect(pager).toContainText('Página 2 de 2');await expect(pager.getByRole('button',{name:'Próxima'})).toBeDisabled();await pager.getByRole('button',{name:'Anterior'}).click();await expect(page.locator('products-admin tbody tr')).toHaveCount(20);
});

test('links, auditoria, perfis e execuções navegam pelo histórico em páginas independentes',async({page})=>{
 await login(page);
 const cases=[
  {path:'/admin/links',api:'/admin/link-imports',selector:'catalog-admin tbody tr',label:'Links cadastrados',key:'items'},
  {path:'/admin/activity',api:'/admin/audit',selector:'.admin-page tbody tr',label:'Atividade administrativa',key:'items'},
  {path:'/admin/profiles',api:'/admin/access-profiles',selector:'users-admin tbody tr',label:'Perfis de acesso',key:'profiles'},
  {path:'/admin/updates',api:'/admin/offer-refresh',selector:'offer-refresh-admin tbody tr',label:'Execuções de atualização',key:'runs'},
 ];
 for(const c of cases){
  await page.route('**/api'+c.api+'?**',async route=>{const p=Number(new URL(route.request().url()).searchParams.get('page'));const response=await route.fetch(),base=await response.json();const rows=Array.from({length:p===1?20:1},(_,i)=>({id:'record-'+((p-1)*20+i),title:'Registro '+i,name:'Registro '+i,category:'Teste',status:'completed',trigger:'manual',total:1,processed:1,updated:1,pending:0,unavailable:0,affiliate_url:'https://www.example.com/',permissions:[],user_count:0,created_at:'2026-10-18T12:00:00Z'}));await route.fulfill({response,json:{...base,[c.key]:rows,items:rows,total:21,page:p,pageSize:20}});});
  await page.goto(c.path);const pager=page.getByRole('navigation',{name:c.label,exact:true});await expect(page.locator(c.selector)).toHaveCount(20);await pager.getByRole('button',{name:'Próxima'}).click();await expect(page.locator(c.selector)).toHaveCount(1);await expect(pager).toContainText('Página 2 de 2');
 }
});
test('marketplaces e ofertas do produto acrescentam cards com rolagem',async({page})=>{
 await login(page);
 await page.route('**/api/admin/catalog-marketplaces?**',async route=>{const p=Number(new URL(route.request().url()).searchParams.get('page'));await route.fulfill({json:{items:Array.from({length:p===1?20:2},(_,i)=>({id:'market-'+((p-1)*20+i),name:'Loja '+i,website_url:'https://www.example.com',logo_url:'',allowed_hosts:['www.example.com'],scraping_enabled:true})),total:22,page:p,pageSize:20}});});
 await page.goto('/admin/marketplaces');await expect(page.locator('.market-grid>section')).toHaveCount(20);await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('.market-grid>section')).toHaveCount(22);
 const products=await (await page.request.get('/api/products')).json(),detail=await (await page.request.get('/api/products/'+products.items[0].id)).json();
 await page.route('**/api/products/'+detail.id+'?**',async route=>{const p=Number(new URL(route.request().url()).searchParams.get('page'));await route.fulfill({json:{...detail,offer_count:22,page:p,pageSize:20,offers:Array.from({length:p===1?20:2},(_,i)=>({...detail.offers[0],id:'offer-'+((p-1)*20+i)}))}});});
 await page.goto('/produto/'+detail.id);await expect(page.locator('offer-card')).toHaveCount(20);await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('offer-card')).toHaveCount(22);await expect(page.locator('.detail-copy')).toContainText('22 ofertas disponíveis');
});

test('primeiro lote pode ser repetido e o botão de carregar mais mantém o foco do teclado',async({page})=>{
 await login(page);let fail=true;
 await page.addInitScript(()=>Object.defineProperty(window,'IntersectionObserver',{value:undefined,configurable:true}));
 await page.route('**/api/me/filters?**',async route=>{if(fail){fail=false;await route.fulfill({status:503,json:{error:'Teste'}});return;}const p=Number(new URL(route.request().url()).searchParams.get('page'));await route.fulfill({json:{items:Array.from({length:p===1?20:2},(_,i)=>({id:'filter-'+((p-1)*20+i),name:'Filtro '+i,filters:{q:'Teste'}})),total:22,page:p,pageSize:20}});});
 await page.goto('/filtros');await page.locator('app-infinite-scroll').getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('.saved-filter-card')).toHaveCount(20);
 const more=page.locator('app-infinite-scroll').getByRole('button',{name:'Carregar mais'});await more.focus();await expect(more).toBeFocused();await more.press('Enter');await expect(page.locator('.saved-filter-card')).toHaveCount(22);await expect(page.locator('app-infinite-scroll button')).toHaveCount(0);
});

test('quantidade por página reinicia a lista e preserva a pesquisa, sem seletor nos cards',async({page})=>{
 await login(page);const requests:URL[]=[];
 await page.route('**/api/admin/products?**',async route=>{const url=new URL(route.request().url());requests.push(url);const size=Number(url.searchParams.get('pageSize')||20),p=Number(url.searchParams.get('page')||1);await route.fulfill({json:{items:Array.from({length:Math.min(size,37-(p-1)*size)},(_,i)=>({...product((p-1)*size+i+1),sku:'ESP_TEST',link_count:0,available_count:0})),total:37,page:p,pageSize:size}});});
 await page.goto('/admin/products');const pager=page.getByRole('navigation',{name:'Produtos',exact:true});await expect(page.locator('products-admin tbody tr')).toHaveCount(20);
 await page.getByRole('textbox',{name:'Pesquisar produtos'}).fill('paginado');await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
 await pager.getByLabel('Itens por página').selectOption('5');await expect(page.locator('products-admin tbody tr')).toHaveCount(5);await expect(pager).toContainText('Página 1 de 8');await pager.getByRole('button',{name:'Próxima'}).click();await expect(pager).toContainText('Página 2 de 8');
 await pager.getByLabel('Itens por página').selectOption('25');await expect(page.locator('products-admin tbody tr')).toHaveCount(25);await expect(pager).toContainText('Página 1 de 2');expect(requests.at(-1)!.searchParams.get('q')).toBe('paginado');expect(requests.at(-1)!.searchParams.get('pageSize')).toBe('25');
 await page.goto('/admin/users');const users=page.getByRole('navigation',{name:'Usuários',exact:true});const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/users'&&new URL(r.url()).searchParams.get('pageSize')==='50');await users.getByLabel('Itens por página').selectOption('50');expect((await response).status()).toBe(200);await expect(users.getByLabel('Itens por página')).toHaveValue('50');
 await page.goto('/');await expect(page.locator('product-card')).not.toHaveCount(0);await expect(page.locator('app-infinite-scroll select')).toHaveCount(0);
});
