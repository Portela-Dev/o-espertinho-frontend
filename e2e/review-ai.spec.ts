import {test,expect} from './coverage';
test('decisões de IA chegam aplicadas, rascunhos aguardam categoria e publicação permanece manual',async({page})=>{
 const category='670e75cd-4da6-482a-87ee-18350ac21e4f',otherCategory='670e75cd-4da6-482a-87ee-18350ac21e4a',id='670e75cd-4da6-482a-87ee-18350ac21e4e',product='670e75cd-4da6-482a-87ee-18350ac21e4d',otherProduct='670e75cd-4da6-482a-87ee-18350ac21e4b';
 let settings={version:1,categoryEnabled:false,productEnabled:false,categoryPrompt:'Escolha categoria existente.',productPrompt:'Compare marca e modelo.'};
 let stage:'draft'|'ready'='draft',published=false,version=1,selectedProduct=product,selectedCategory=category;const mutations:any[]=[];
 const paged=(items:any[])=>({items,total:items.length,page:1,pageSize:20});
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.method()==='GET'?null:req.postDataJSON();if(req.method()!=='GET')mutations.push({path,body});let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'test',name:'Admin',email:'admin@example.test',role:'admin',avatar:null,permissions:['catalog','discovery','affiliate_links']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path==='/api/admin/catalog-marketplaces')data=[{id:'amazon',name:'Amazon'}];
  else if(path.endsWith('/ai/settings')){if(req.method()==='PUT')settings={...body,version:body.version+1};data=settings;}
  else if(path.endsWith('/enrichment/categories'))data=[{id:category,path:['Tecnologia','Áudio']},{id:otherCategory,path:['Casa']}];
  else if(path.endsWith('/enrichment/review'))data=paged([{id,url:'https://example.com/product',affiliate_url:'https://example.com/aff',marketplace_name:'Loja',extraction_status:'completed',enrichment_version:version,source_category_path:['Áudio'],enrichment_data:{title:'Headset Modelo X',description:'Descrição extraída',brand:'Marca',images:[],priceCents:10000},product_id:stage==='ready'?selectedProduct:null,product_name:'Headset Modelo X',product_draft_id:stage==='draft'?id:null,draft_name:'Headset canônico',confirmed_category_id:stage==='ready'?selectedCategory:null,confirmed_category_path:stage==='ready'?(selectedCategory===category?['Tecnologia','Áudio']:['Casa']):null,ai_resolution:{product:{automatic:true,outcome:stage==='draft'?'drafted':'linked'}}}]);
  else if(path.endsWith('/products'))data=paged([{id:otherProduct,name:'Outro produto de outra categoria',brand:'Marca',sku:'ESP-test',category_path:['Casa']}]);
  else if(path.endsWith('/product')){selectedProduct=body.productId;selectedCategory=otherCategory;version++;data={ok:true};}
  else if(path.endsWith('/publish')){published=true;data={ok:true};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');await expect(panel).toBeVisible();
 await panel.getByRole('button',{name:'Configurações de IA',exact:true}).click();const config=panel.locator('review-ai-settings');
 await config.getByLabel('Ativar classificação de produto por IA',{exact:true}).check();await expect(config.getByLabel('Ativar categorização por IA',{exact:true})).not.toBeChecked();
 await config.getByLabel('Instruções para vincular ou criar produtos').fill('Reaproveite os produtos e rascunhos.');await config.getByRole('button',{name:'Salvar configurações de IA'}).click();await expect.poll(()=>settings.productEnabled).toBe(true);expect(settings.categoryEnabled).toBe(false);
 await panel.getByRole('button',{name:'Revisão dos links',exact:true}).click();await expect(panel).toContainText('Rascunho aguardando categorização');await expect(panel).toContainText('Rascunho: Headset canônico');
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await expect(panel.getByRole('button',{name:'Publicar',exact:true})).toBeDisabled();await page.keyboard.press('Escape');
 // Simulate the extension's category decision arriving already applied, without an admin confirmation request.
 stage='ready';version++;await panel.getByRole('button',{name:'Atualizar lista',exact:true}).click();await expect(panel).toContainText('Categoria confirmada');await expect(panel).toContainText('Decisão da IA aplicada automaticamente');
 expect(mutations.filter(m=>/\/(category|product)$/.test(m.path))).toHaveLength(0);expect(published).toBe(false);
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Atribuir Produto',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Produtos de todo o catálogo');
 await dialog.getByRole('radio',{name:'Selecionar Outro produto de outra categoria'}).check();await dialog.getByRole('button',{name:'Confirmar atribuição',exact:true}).click();await expect(dialog).toBeHidden();await expect(panel).toContainText('Casa');
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Publicar',exact:true}).click();expect(published).toBe(false);await page.getByRole('button',{name:'Confirmar e publicar',exact:true}).click();await expect.poll(()=>published).toBe(true);
});

test('anúncio inválido mostra conflito, filtra revisão e só oferece nova extração, sem publicar',async({page})=>{
 const id='670e75cd-4da6-482a-87ee-18350ac21e4e';let retried=false;const mutations:any[]=[];let state='';
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;let data:any=[];
  if(req.method()!=='GET')mutations.push(path);
  if(path==='/api/auth/session')data={user:{id:'test',name:'Admin',email:'admin@example.test',role:'admin',permissions:['catalog','discovery','affiliate_links']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path==='/api/admin/catalog-marketplaces')data=[{id:'amazon',name:'Amazon'}];
  else if(path.endsWith('/enrichment/review')){state=url.searchParams.get('state')||'';data={items:[{id,status:'pending',url:'https://example.test/p',affiliate_url:'https://example.test/a',extraction_status:retried?'pending':'completed',enrichment_version:2,source_category_path:[],enrichment_data:{title:'Celular Modelo X',description:'256 GB',priceCents:10000},ai_resolution:{product:{action:'invalid',reason:'Título informa 128 GB; descrição informa 256 GB.'}}}],total:1,page:1,pageSize:20};}
  else if(path.endsWith('/retry')){retried=true;data={ok:true};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');await expect(panel).toContainText('Anúncio inválido');await expect(panel).toContainText('Título informa 128 GB; descrição informa 256 GB.');
 await panel.getByLabel('Estado da revisão / extração').selectOption('invalid');await expect.poll(()=>state).toBe('invalid');
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await expect(panel.getByRole('button',{name:'Publicar',exact:true})).toBeDisabled();await expect(panel.getByRole('button',{name:'Atribuir Produto',exact:true})).toBeDisabled();
 await panel.getByRole('button',{name:'Extrair novamente para reavaliar',exact:true}).click();await expect.poll(()=>retried).toBe(true);expect(mutations).toEqual(['/api/admin/discovery/enrichment/review/'+id+'/retry']);
});
