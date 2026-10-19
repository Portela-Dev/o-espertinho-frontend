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
 await panel.getByText('Ações',{exact:true}).last().click();await panel.getByRole('button',{name:'Categorizar',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Categoria do O Espertinho')).toHaveValue(category);expect(confirmed).toBe(false);await dialog.getByLabel('Salvar também o mapeamento',{exact:false}).check();await dialog.getByRole('button',{name:'Confirmar categoria deste item'}).click();await expect(panel).toContainText('Categoria confirmada');
 await panel.getByRole('button',{name:'Execuções de enriquecimento'}).click();await expect(panel).toContainText('1 concluídos');await panel.getByRole('button',{name:'Cancelar',exact:true}).click();const alert=page.getByRole('alertdialog');await alert.getByRole('button',{name:'Confirmar cancelamento'}).click();await expect(panel).toContainText('Cancelado');expect(cancelled).toBe(true);
});
