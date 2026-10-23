import {test,expect} from './coverage';
test('publicação em massa seleciona links entre páginas e exige confirmação única, mostrando falhas individuais',async({page})=>{
 const items=Array.from({length:22},(_,i)=>({id:'link-'+i,url:'https://example.com/p/'+i,affiliate_url:'https://example.com/aff/'+i,marketplace_name:'Loja',extraction_status:'completed',enrichment_version:3,source_category_path:['Origem'],product_id:i===21?null:'product-'+i,confirmed_category_id:'category',confirmed_category_path:['Tecnologia'],enrichment_data:{title:'Produto '+i,priceCents:10000,images:[]}}));let submitted:any,requests=0;const removed=new Set<string>();
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'admin',name:'Admin',email:'admin@example.test',role:'admin',permissions:['catalog','discovery']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path.endsWith('/catalog-marketplaces'))data=[{id:'shop',name:'Loja'}];
  else if(path.endsWith('/enrichment/categories'))data=[{id:'category',path:['Tecnologia']}];
  else if(path.endsWith('/enrichment/review')){const current=items.filter(i=>!removed.has(i.id)),page=Number(url.searchParams.get('page')||1);data={items:current.slice((page-1)*20,page*20),page,pageSize:20,total:current.length};}
  else if(path.endsWith('/publish-batch')){requests++;submitted=req.postDataJSON();const results=submitted.items.map((item:any,i:number)=>{if(i!==1)removed.add(item.id);return {id:item.id,ok:i!==1,...(i===1?{message:'Os dados perderam a validade.'}:{offerId:'offer-'+i})};});data={results,published:results.length-1,failed:1};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/offers');const panel=page.locator('enrichment-admin');await expect(panel.getByRole('checkbox')).toHaveCount(20);
 await panel.getByRole('button',{name:'Selecionar aptos desta página',exact:true}).click();await expect(panel).toContainText('20 links selecionados');
 await panel.getByRole('button',{name:'Próxima →',exact:true}).click();await expect(panel.getByRole('checkbox')).toHaveCount(2);await expect(panel.getByRole('checkbox').last()).toBeDisabled();
 await panel.getByRole('button',{name:'Selecionar aptos desta página',exact:true}).click();await expect(panel).toContainText('21 links selecionados');
 await panel.getByRole('button',{name:'Publicar selecionados',exact:true}).click();expect(requests).toBe(0);const dialog=page.getByRole('alertdialog');await expect(dialog).toContainText('Publicar 21 ofertas?');
 await dialog.getByRole('button',{name:'Confirmar publicação em massa',exact:true}).click();await expect(dialog).toBeHidden();expect(requests).toBe(1);expect(submitted.authorizedContent).toBe(true);expect(submitted.items).toHaveLength(21);expect(new Set(submitted.items.map((item:any)=>item.id)).size).toBe(21);expect(submitted.items.every((item:any)=>item.version===3)).toBe(true);await expect(panel).toContainText('Os dados perderam a validade.');await expect(panel).toContainText('0 links selecionados');
});
