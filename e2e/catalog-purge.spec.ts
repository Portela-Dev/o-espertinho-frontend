import {test,expect} from './coverage';

test('expurgo tem períodos independentes, prévia e confirmação física; editar invalida a prévia',async({page})=>{
 let lastCriteria:any=null,executions=0;const counts={offers:3,discoveredLinks:4,products:2,priceHistory:9,favorites:1,collectionItems:2,clicks:5,productDrafts:1,previews:2};
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'admin',email:'admin@example.test',name:'Admin',role:'admin',permissions:['purge']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path.endsWith('/purge/preview')){lastCriteria=req.postDataJSON();data={criteria:lastCriteria,counts,previewToken:'signed-preview',asOf:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()};}
  else if(path.endsWith('/purge/execute')){expect(req.postDataJSON()).toEqual({previewToken:'signed-preview',confirmed:true});executions++;data={ok:true,counts};}
  await route.fulfill({json:data});
 });
 await page.goto('/admin/purge');const panel=page.locator('catalog-purge');await expect(panel).toBeVisible();await expect(panel.getByLabel('Período dos links (dias)')).toHaveValue('30');await expect(panel.getByLabel('Período dos produtos (dias)')).toHaveValue('30');
 await panel.getByRole('button',{name:'Calcular prévia do expurgo'}).click();await expect(panel.getByRole('heading',{name:'Prévia da exclusão'})).toBeVisible();expect(lastCriteria).toEqual({links:true,products:true,linksDays:30,productsDays:30});expect(executions).toBe(0);
 await panel.getByLabel('Período dos links (dias)').fill('45');await expect(panel.getByRole('heading',{name:'Prévia da exclusão'})).toBeHidden();
 await panel.getByRole('button',{name:'Calcular prévia do expurgo'}).click();await panel.getByRole('button',{name:'Revisar e excluir definitivamente'}).click();const modal=page.getByRole('alertdialog');await expect(modal.getByRole('button',{name:'Confirmar expurgo'})).toBeDisabled();
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();expect(executions).toBe(0);
 await panel.getByRole('button',{name:'Revisar e excluir definitivamente'}).click();await modal.getByLabel('Confirmo a exclusão física e irreversível dos registros desta prévia.').check();await modal.getByRole('button',{name:'Confirmar expurgo'}).click();await expect(panel.getByRole('status')).toContainText('Expurgo concluído');expect(executions).toBe(1);expect(lastCriteria.linksDays).toBe(45);
});

test('editor de catálogo não vê a manutenção e não acessa a rota de expurgo',async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let data:any=[];
  if(path==='/api/auth/session')data={user:{id:'editor',email:'editor@example.test',name:'Editor',role:'user',permissions:['catalog']},autoSignInAllowed:false};
  else if(path==='/api/config')data={googleClientId:''};
  else if(path==='/api/admin/products')data={items:[],total:0,page:1,pageSize:20};
  await route.fulfill({json:data});
 });
 await page.goto('/admin/purge');await expect(page.locator('products-admin')).toBeVisible();await expect(page.locator('catalog-purge')).toBeHidden();await expect(page.getByRole('navigation',{name:'Administração'}).getByRole('link',{name:'Manutenção',exact:true})).toBeHidden();
});
