import {test,expect} from './coverage';

test('configuração independente e sugestões de IA só são aplicadas após confirmação da revisão',async({page})=>{
 const category='670e75cd-4da6-482a-87ee-18350ac21e4f',id='670e75cd-4da6-482a-87ee-18350ac21e4e';
 let settings={version:1,categoryEnabled:false,productEnabled:false,categoryPrompt:'Escolha categoria existente.',productPrompt:'Compare marca e modelo.'};
 let categoryConfirmed=false,productConfirmed=false,version=1;const mutations:any[]=[];
 const paged=(items:any[])=>({items,total:items.length,page:1,pageSize:20});
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.method()==='GET'?null:req.postDataJSON();
  if(req.method()!=='GET')mutations.push({path,body});
  let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'test',name:'Admin',email:'admin@example.test',role:'admin',avatar:null,permissions:['catalog','discovery','affiliate_links']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path==='/api/admin/catalog-marketplaces')data=[{id:'amazon',name:'Amazon'}];
  else if(path.endsWith('/ai/settings')){if(req.method()==='PUT')settings={...body,version:body.version+1};data=settings;}
  else if(path.endsWith('/enrichment/categories'))data=[{id:category,path:['Tecnologia','Áudio']}];
  else if(path.endsWith('/enrichment/review'))data=paged([{id,url:'https://example.com/product',marketplace_name:'Loja',extraction_status:'completed',enrichment_version:version,source_category_path:['Áudio'],enrichment_data:{title:'Headset Modelo X',description:'Descrição extraída',brand:'Marca',images:[]},confirmed_category_id:categoryConfirmed?category:null,confirmed_category_path:categoryConfirmed?['Tecnologia','Áudio']:null,
   ai_category:!categoryConfirmed?{category:'Tecnologia > Áudio',categoryId:category,categoryPath:['Tecnologia','Áudio'],reason:'Categoria encontrada no catálogo'}:null,
   ai_product:categoryConfirmed&&!productConfirmed?{action:'create_new',product:{name:'Headset Modelo X sugerido',description:'Descrição sugerida',brand:'Marca sugerida'},reason:'Nenhum candidato equivalente.'}:null}]);
  else if(path.endsWith('/category')){categoryConfirmed=true;version++;data={ok:true};}
  else if(path.endsWith('/products'))data=paged([]);
  else if(path.endsWith('/product')){productConfirmed=true;version++;data={ok:true};}
  else if(path==='/api/offers')data=paged([]);
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');await expect(panel).toBeVisible();
 await panel.getByRole('button',{name:'Configurações de IA',exact:true}).click();const config=panel.locator('review-ai-settings');
 await config.getByLabel('Ativar categorização por IA',{exact:true}).check();await expect(config.getByLabel('Ativar classificação de produto por IA',{exact:true})).not.toBeChecked();
 await config.getByLabel('Instruções de categorização',{exact:true}).fill('Use árvores existentes antes de sugerir novas.');
 await config.getByRole('button',{name:'Salvar configurações de IA',exact:true}).click();await expect.poll(()=>settings.categoryEnabled).toBe(true);expect(settings.productEnabled).toBe(false);expect(settings.categoryPrompt).toBe('Use árvores existentes antes de sugerir novas.');
 await panel.getByRole('button',{name:'Revisão dos links',exact:true}).click();await expect(panel).toContainText('Sugestão de IA — confirmar');expect(categoryConfirmed).toBe(false);
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Categorizar',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Categoria do O Espertinho')).toHaveValue(category);expect(categoryConfirmed).toBe(false);
 await dialog.getByRole('button',{name:'Confirmar categoria deste item'}).click();await expect.poll(()=>categoryConfirmed).toBe(true);
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Atribuir Produto',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Nome',{exact:true})).toHaveValue('Headset Modelo X sugerido');expect(productConfirmed).toBe(false);
 await dialog.getByLabel('Nome',{exact:true}).fill('Nome revisado pelo admin');await dialog.getByRole('button',{name:'Criar e atribuir produto',exact:true}).click();await expect.poll(()=>productConfirmed).toBe(true);
 const assignment=mutations.find(m=>m.path.endsWith('/product'));expect(assignment.body.product.name).toBe('Nome revisado pelo admin');expect(assignment.body.mode).toBe('new');
});
