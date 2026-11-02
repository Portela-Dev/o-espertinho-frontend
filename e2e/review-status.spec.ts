import {test,expect} from './coverage';

test('status único permite filtrar prontos e publicados e confirma transição após publicar',async({page})=>{
 let published=false;
 const rows=[
  {id:'ready',review_status:'ready',enrichment_data:{title:'Oferta pronta',priceCents:12300}},
  {id:'published',review_status:'published',published_offer_id:'offer-old',enrichment_data:{title:'Oferta publicada',priceCents:12300}},
  {id:'invalid',review_status:'invalid',ai_resolution:{product:{action:'invalid',reason:'Contradição no anúncio'}},enrichment_data:{title:'Oferta inválida',priceCents:12300}},
  {id:'category',review_status:'awaiting_category',enrichment_data:{title:'Oferta sem categoria',priceCents:12300}},
 ].map(row=>({...row,url:'https://example.com/'+row.id,marketplace_name:'Loja',extraction_status:'completed',source_category_path:[],enrichment_version:1}));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'admin',name:'Admin',role:'admin',permissions:['catalog','discovery'],email:'admin@example.test'},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path.endsWith('/catalog-marketplaces'))data=[{id:'test',name:'Loja'}];
  else if(path.endsWith('/review')){const state=url.searchParams.get('state');const all=rows.map(row=>row.id==='ready'&&published?{...row,review_status:'published',published_offer_id:'offer-new'}:row),items=all.filter(row=>!state||row.review_status===state);data={items,total:items.length,page:1,pageSize:20};}
  else if(path.endsWith('/ready/publish')){expect(req.postDataJSON()).toEqual({version:1,authorizedContent:true});published=true;data={offerId:'offer-new'};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin'),status=panel.getByRole('combobox',{name:'Status',exact:true});
 await expect(panel.getByRole('columnheader',{name:'Status',exact:true})).toBeVisible();
 await expect(panel.getByRole('columnheader',{name:'Extração',exact:true})).toHaveCount(0);
 const invalid=panel.locator('tbody tr').filter({hasText:'Oferta inválida'});await expect(invalid.locator('td').nth(2)).toHaveText('Anúncio inválido');await expect(invalid).not.toContainText('Concluído');await expect(invalid.getByRole('checkbox')).toBeDisabled();
 await expect(panel.locator('tbody tr').filter({hasText:'Oferta publicada'}).getByRole('checkbox')).toBeDisabled();
 await status.selectOption('ready');await expect(panel.locator('tbody tr')).toHaveCount(1);await expect(panel.locator('tbody tr td').nth(2)).toHaveText('Pronto para publicar');
 await panel.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Publicar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Confirmar e publicar'}).click();await expect(panel.locator('tbody tr')).toHaveCount(0);
 await status.selectOption('published');await expect(panel.locator('tbody tr')).toHaveCount(2);await expect(panel.locator('tbody tr td .badge')).toHaveText(['Publicado','Publicado']);
 await expect(status.locator('option[value="completed"]')).toHaveCount(0);
});

test('publicação remove duplicatas da lista e informa o resultado individual e em massa',async({page})=>{
 const removed=new Set<string>();
 const rows=['single','batch'].map(id=>({id,review_status:'ready',url:'https://example.com/'+id,marketplace_name:'Loja',extraction_status:'completed',source_category_path:[],enrichment_version:1,enrichment_data:{title:'Duplicata '+id,priceCents:12300}}));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'admin',name:'Admin',role:'admin',permissions:['catalog','discovery']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path.endsWith('/catalog-marketplaces'))data=[{id:'test',name:'Loja'}];
  else if(path.endsWith('/review')){const items=rows.filter(r=>!removed.has(r.id));data={items,total:items.length,page:1,pageSize:20};}
  else if(path.endsWith('/single/publish')){removed.add('single');data={offerId:'existing',alreadyPublished:true,duplicateRemoved:true};}
  else if(path.endsWith('/publish-batch')){removed.add('batch');data={results:[{id:'batch',ok:true,offerId:'existing',alreadyPublished:true,duplicateRemoved:true}],published:0,deduplicated:1,failed:0};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');
 const single=panel.locator('tbody tr').filter({hasText:'Duplicata single'});
 await single.getByRole('button',{name:'Ações do link',exact:true}).click();await panel.getByRole('button',{name:'Publicar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Confirmar e publicar'}).click();
 await expect(panel.locator('tbody tr')).toHaveCount(1);await expect(page.getByText('A oferta já existe. Duplicação removida da revisão.',{exact:true})).toBeVisible();
 await panel.locator('tbody tr').getByRole('checkbox').check();await panel.getByRole('button',{name:'Publicar selecionados',exact:true}).click();await page.getByRole('button',{name:'Confirmar publicação em massa'}).click();
 await expect(panel.locator('tbody tr')).toHaveCount(0);
 await expect(panel.getByText('Duplicata batch: Duplicação removida; oferta existente preservada',{exact:true})).toBeVisible();
 await expect(page.getByText('Publicadas: 0. Duplicações removidas: 1. Não publicadas: 0.',{exact:true})).toBeVisible();
});
