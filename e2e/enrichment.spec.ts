import {test,expect} from './coverage';
test('enrichment review requires explicit category confirmation and exposes manual progress/cancel',async({page})=>{
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).callback=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Login de teste';b.onclick=()=>(window as any).callback({credential:'admin'});el.appendChild(b);}}}};});
 const category='6aca8907-fdb2-428f-a17e-299d817a5dd4',link='f1734200-4a7b-4df9-8fce-c9e0ba36f213';let confirmed=false,cancelled=false;
 const item=()=>({id:link,url:'https://www.amazon.com.br/product/test',marketplace_id:'amazon',marketplace_name:'Amazon',extraction_status:'completed',source_category_path:['Eletrônicos','Fones'],enrichment_data:{title:'Fone enriquecido',description:'Descrição para revisão',priceCents:10000,images:[],availability:'available'},enrichment_version:1,suggested_category_id:category,suggested_category_path:['Tecnologia'],confirmed_category_id:confirmed?category:null,confirmed_category_path:confirmed?['Tecnologia']:null});
 const paged=(items:any[])=>({items,total:items.length,page:1,pageSize:20});
 await page.route('**/api/admin/discovery/enrichment/**',async route=>{const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(path.endsWith('/categories'))return route.fulfill({json:[{id:category,path:['Tecnologia']}]});
  if(path.endsWith('/review'))return route.fulfill({json:paged([item()])});
  if(path.endsWith('/category')){expect(request.postDataJSON()).toEqual({categoryId:category,version:1,saveMapping:true});confirmed=true;return route.fulfill({json:{ok:true}});}
  if(path.includes('/settings/'))return route.fulfill({json:{request_interval_ms:2000,category_separator:'>'}});
  if(path.endsWith('/cancel')){cancelled=true;return route.fulfill({json:{ok:true}});}
  if(path.endsWith('/runs'))return route.fulfill({json:paged([{id:link,marketplace_name:'Amazon',status:cancelled?'cancelled':'running',completed:1,failed:0,skipped:0,total:2,created_at:new Date().toISOString()}])});
  if(path.endsWith('/mappings'))return route.fulfill({json:paged([])});
  return route.fulfill({json:paged([])});
 });
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');await expect(panel).toContainText('Categoria sugerida — confirmar');expect(confirmed).toBe(false);
 const row=panel.locator('tbody tr').first();const initialHeight=(await row.boundingBox())!.height;
 const actions=panel.getByRole('button',{name:'Ações do link',exact:true}),menu=panel.getByRole('group',{name:'Ações do link'});
 await actions.click();await expect(menu).toBeVisible();await expect(menu.getByRole('button',{name:'Atribuir Produto',exact:true})).toBeDisabled();expect((await row.boundingBox())!.height).toBe(initialHeight);
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();
 await actions.click();await panel.getByRole('heading',{name:'Enriquecimento e categorização dos links descobertos'}).click();await expect(menu).toBeHidden();
 await actions.click();await panel.getByRole('button',{name:'Categorizar',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Categoria do O Espertinho')).toHaveValue(category);expect(confirmed).toBe(false);await dialog.getByLabel('Salvar também o mapeamento',{exact:false}).check();await dialog.getByRole('button',{name:'Confirmar categoria deste item'}).click();await expect(panel).toContainText('Categoria confirmada');

});
test('category review creates a ten-level tree inline, preserves failed drafts and requires explicit assignment',async({page})=>{
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).callback=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Login de teste';b.onclick=()=>(window as any).callback({credential:'admin'});el.appendChild(b);}}}};});
 const link='d471e870-d6de-4686-9d01-33f018724753';let created:any,confirmed=false,failOnce=true;
 await page.route('**/api/admin/discovery/enrichment/review?**',route=>route.fulfill({json:{items:[{id:link,url:'https://www.amazon.com.br/product/inline-category',marketplace_id:'amazon',marketplace_name:'Amazon',extraction_status:'completed',source_category_path:['Origem'],enrichment_data:{title:'Produto para categorizar'},enrichment_version:1,confirmed_category_id:confirmed?created.id:null,confirmed_category_path:confirmed?created.path:null}],page:1,pageSize:20,total:1}}));
 await page.route('**/api/admin/discovery/enrichment/categories',async route=>{if(route.request().method()==='POST'&&failOnce){failOnce=false;await route.fulfill({status:503,json:{error:'Falha temporária ao criar árvore'}});}else await route.continue();});
 await page.route('**/api/admin/discovery/enrichment/review/'+link+'/category',async route=>{expect(route.request().postDataJSON()).toEqual({categoryId:created.id,version:1,saveMapping:false});confirmed=true;await route.fulfill({json:{ok:true}});});
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Categorizar',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'Criar nova árvore',exact:false}).click();const fields=dialog.locator('offer-category-fields input');await fields.nth(0).fill('Tecnologia');await expect(dialog.locator('datalist option[value="Tecnologia"]')).toHaveCount(1);
 const path=['Tecnologia','Criada na revisão',...Array.from({length:8},(_,i)=>'Nível '+(i+3))];for(let level=1;level<path.length;level++)await fields.nth(level).fill(path[level]);await expect(fields).toHaveCount(10);
 await expect(dialog.getByRole('button',{name:'Confirmar categoria deste item'})).toBeDisabled();
 await dialog.getByRole('button',{name:'Salvar e selecionar árvore'}).click();await expect(page.getByRole('alert')).toContainText('Falha temporária ao criar árvore');await expect(fields.nth(9)).toHaveValue('Nível 10');
 const response=page.waitForResponse(r=>r.url().endsWith('/enrichment/categories')&&r.request().method()==='POST'&&r.status()===201);await dialog.getByRole('button',{name:'Salvar e selecionar árvore'}).click();await response;await expect(dialog.locator('offer-category-fields')).toHaveCount(0);const persisted=await (await page.request.get('/api/admin/discovery/enrichment/categories')).json();created=persisted.find((node:any)=>JSON.stringify(node.path)===JSON.stringify(path));expect(created).toBeTruthy();expect(created.path).toEqual(path);for(let level=1;level<=10;level++)expect(persisted.some((node:any)=>JSON.stringify(node.path)===JSON.stringify(path.slice(0,level)))).toBe(true);
 await expect(dialog.locator('offer-category-fields')).toHaveCount(0);await expect(dialog.getByLabel('Categoria do O Espertinho')).toHaveValue(created.id);expect(confirmed).toBe(false);
 const nodes=await (await page.request.get('/api/admin/discovery/enrichment/categories')).json();expect(nodes.some((node:any)=>node.id===created.id)).toBe(true);
 await dialog.getByRole('button',{name:'Confirmar categoria deste item'}).click();await expect(panel).toContainText('Categoria confirmada');expect(confirmed).toBe(true);
});


test('confirmed review assigns existing products and creates editable prefilled products with real backend',async({page})=>{
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).callback=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Login de teste';b.onclick=()=>(window as any).callback({credential:'admin'});el.appendChild(b);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);await page.goto('/admin/offers');
 const panel=page.locator('enrichment-admin');let row=panel.locator('tbody tr').filter({hasText:'Link para produto existente'});
 await row.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Atribuir Produto',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Atribuir Produto',exact:true});await expect(dialog).toContainText('Categoria confirmada: Tecnologia');
 await dialog.getByLabel('Buscar produto por nome ou SKU').fill('Monitor');await dialog.getByRole('button',{name:'Buscar produtos',exact:true}).click();
 await dialog.getByRole('radio',{name:'Selecionar Monitor',exact:false}).check();
 const assigned=page.waitForResponse(r=>r.url().endsWith('/6ef4f2a1-912f-463a-a6e8-43c505976781/product')&&r.status()===200);
 await dialog.getByRole('button',{name:'Confirmar atribuição',exact:true}).click();expect((await (await assigned).json()).status).toBe('ready_for_review');await expect(dialog).toBeHidden();await expect(row).toContainText('Produto: Monitor');
 row=panel.locator('tbody tr').filter({hasText:'Produto descoberto para criar'});await row.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Atribuir Produto',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Atribuir Produto',exact:true});await dialog.getByRole('button',{name:'Criar novo produto',exact:true}).click();
 await expect(dialog.getByLabel('Nome',{exact:true})).toHaveValue('Produto descoberto para criar');await expect(dialog.getByLabel('Descrição (opcional)',{exact:true})).toHaveValue('Descrição extraída do produto');await expect(dialog.getByLabel('Marca (opcional)',{exact:true})).toHaveValue('Marca extraída');await expect(dialog.getByLabel('URL da imagem (opcional)',{exact:true})).toHaveValue('https://example.com/image.jpg');
 await dialog.getByLabel('Nome',{exact:true}).fill('Produto criado na revisão');await dialog.getByLabel('Marca (opcional)',{exact:true}).fill('Marca revisada');
 let failOnce=true;await page.route('**/enrichment/review/6ef4f2a1-912f-463a-a6e8-43c505976782/product',async route=>{if(failOnce){failOnce=false;await route.fulfill({status:503,json:{error:'Falha temporária ao atribuir'}});}else await route.continue();});
 await dialog.getByRole('button',{name:'Criar e atribuir produto',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Falha temporária ao atribuir');await expect(dialog.getByLabel('Nome',{exact:true})).toHaveValue('Produto criado na revisão');
 const created=page.waitForResponse(r=>r.url().endsWith('/6ef4f2a1-912f-463a-a6e8-43c505976782/product')&&r.status()===200);await dialog.getByRole('button',{name:'Criar e atribuir produto',exact:true}).click();
 await created;await expect(dialog).toBeHidden();await expect(row).toContainText('Produto: Produto criado na revisão');const products=await (await page.request.get('/api/admin/products?q='+encodeURIComponent('Produto criado na revisão'))).json();const product=products.find((product:any)=>product.name==='Produto criado na revisão');expect(product).toBeTruthy();expect(product.brand).toBe('Marca revisada');expect(product.category_path).toEqual(['Tecnologia']);
});


test('floating review menu marks failed links pending without creating a legacy job',async({page})=>{
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).callback=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Login de teste';b.onclick=()=>(window as any).callback({credential:'admin'});el.appendChild(b);}}}};});
 const id='c6711a7d-7acf-410d-a0b5-39fc8195ee63';let pending=false;
 await page.route('**/api/admin/discovery/enrichment/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/review'))return route.fulfill({json:{items:[{id,url:'https://example.com/product',marketplace_name:'Teste',extraction_status:pending?'pending':'failed',extraction_error:pending?'':'incomplete',source_category_path:[]}],total:1,page:1,pageSize:20}});
  if(path.endsWith('/retry')){pending=true;return route.fulfill({status:202,json:{id,status:'pending',executor:'extension'}});}
  return route.fulfill({json:[]});
 });
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');
 const row=panel.locator('tbody tr').first(),height=(await row.boundingBox())!.height;
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();const menu=panel.getByRole('group',{name:'Ações do link',exact:true});await expect(menu).toBeVisible();expect((await row.boundingBox())!.height).toBe(height);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await expect(menu).toBeVisible();await expect.poll(async()=>{const bounds=await menu.boundingBox();return !!bounds&&bounds.x>=0&&bounds.x+bounds.width<=390;}).toBe(true);
 await menu.getByRole('button',{name:'Retentar extração',exact:true}).click();await expect.poll(()=>pending).toBe(true);await expect(row).toContainText('Pendente');await expect(page.locator('.toast')).toContainText('passo 3');
});
