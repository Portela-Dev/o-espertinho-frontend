import {test,expect} from './coverage';

for(const mapping of [false,true]){
 test('pesquisa categorias '+(mapping?'na edição de mapeamentos':'na revisão de ofertas'),async({page})=>{
  const categories=[{id:'audio',path:['Informática','Acessórios','Áudio e Vídeo']},{id:'fones',path:['Informática','Fones de ouvido']},{id:'casa',path:['Casa','Cozinha']}];
  const mutations:any[]=[];
  await page.route('**/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let data:any=[];
   if(req.method()!=='GET')mutations.push({path,body:req.postDataJSON()});
   if(path==='/api/auth/session')data={user:{id:'admin',name:'Admin',role:'admin',permissions:['catalog','discovery']},autoSignInAllowed:false};
   else if(path==='/api/config')data={googleClientId:''};
   else if(path.endsWith('/enrichment/categories'))data=categories;
   else if(path.endsWith('/enrichment/review'))data={items:[{id:'link',status:'pending',url:'https://example.test/product',extraction_status:'completed',review_status:'awaiting_category',enrichment_version:3,source_category_path:['Eletrônicos'],suggested_category_id:'casa'}],total:1,page:1,pageSize:20};
   else if(path.endsWith('/enrichment/mappings'))data={items:[{id:'mapping',marketplace_name:'Loja',source_path:['Eletrônicos'],category_id:'casa',category_path:['Casa','Cozinha']}],total:1,page:1,pageSize:20};
   else if(req.method()!=='GET')data={ok:true};
   await route.fulfill({json:data});
  });
  await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');
  const open=async()=>{
   if(mapping){await panel.getByRole('button',{name:'Vincular categorias',exact:true}).click();await panel.getByRole('button',{name:'Ações do mapeamento',exact:true}).click();await panel.getByRole('button',{name:'Editar',exact:true}).click();}
   else{await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Categorizar',exact:true}).click();}
  };
  await open();const dialog=page.getByRole('dialog'),search=dialog.getByRole('searchbox',{name:'Buscar categorias'}),select=dialog.getByRole('combobox');
  await expect(select).toHaveValue('casa');await search.fill('  INFORMATICA   audio ');
  await expect(select.locator('option[value="audio"]')).toHaveCount(1);await expect(select.locator('option[value="fones"]')).toHaveCount(0);
  await expect(select).toHaveValue('casa');await expect(select.locator('option[value="casa"]')).toContainText('selecionada');
  await search.fill('categoria inexistente');await expect(dialog.getByRole('status')).toContainText('Nenhuma categoria encontrada');await expect(select).toHaveValue('casa');
  await search.fill('');await expect(select.locator('option[value="fones"]')).toHaveCount(1);await expect(dialog.getByRole('status')).toHaveCount(0);
  await search.fill('cozinha');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();expect(mutations).toEqual([]);
  await open();await expect(search).toHaveValue('');await expect(select.locator('option[value="audio"]')).toHaveCount(1);
  await search.fill('informatica video');await select.selectOption('audio');expect(mutations).toEqual([]);
  await dialog.getByRole('button',{name:mapping?'Salvar mapeamento':'Confirmar categoria',exact:true}).click();await expect(dialog).toBeHidden();
  expect(mutations).toEqual([{path:mapping?'/api/admin/discovery/enrichment/mappings/mapping':'/api/admin/discovery/enrichment/review/link/category',body:mapping?{categoryId:'audio'}:{categoryId:'audio',version:3,saveMapping:true}}]);
 });
}
