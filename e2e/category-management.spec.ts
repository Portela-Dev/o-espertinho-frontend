import {test,expect,Page} from './coverage';
import {chooseAction} from './actions';
async function login(page:Page){
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).categoryLogin=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Entrar para teste de categorias';b.onclick=()=>(window as any).categoryLogin({credential:'admin'});el.appendChild(b);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Entrar para teste de categorias'}).click();await expect(page).not.toHaveURL(/entrar/);
}
async function send(page:Page,path:string,body:any){return page.evaluate(async({path,body})=>{
 const token=decodeURIComponent(document.cookie.split('; ').find(v=>v.startsWith('XSRF-TOKEN='))!.split('=').slice(1).join('='));
 const r=await fetch('/api'+path,{method:'POST',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':token},body:JSON.stringify(body)});
 if(!r.ok)throw new Error(await r.text());return r.json();
 },{path,body});}
async function create(page:Page,path:string[]){return send(page,'/admin/products',{name:'Produto '+path.join(' '),categoryPath:path});}
const categoryRow=(page:Page,path:string)=>page.locator('categories-admin tbody tr').filter({has:page.getByRole('cell',{name:path,exact:true})});
async function open(page:Page,path:string,action:string){await chooseAction(categoryRow(page,path),action);return page.getByRole('dialog',{name:action+' categoria',exact:true});}
async function confirm(dialog:ReturnType<Page['getByRole']>){await dialog.getByRole('button',{name:'Gerar prévia',exact:true}).click();await expect(dialog.getByRole('region',{name:'Prévia da alteração'})).toBeVisible();await dialog.getByRole('button',{name:'Confirmar alteração'}).click();await expect(dialog).toBeHidden();}

test('gestão de categorias renomeia, move, une e exclui com realocação preservando produtos',async({page})=>{
 await login(page);
 const prefix='GestCat '+Date.now(),a=prefix+' Origem',b=prefix+' Destino',c=prefix+' Realocação';
 const first=await create(page,[a,'Som']),second=await create(page,[b,'Fones']),third=await create(page,[c]);
 await page.goto('/admin/categories');await expect(page.getByRole('heading',{name:'Categorias e subcategorias'})).toBeVisible();
 await page.getByRole('textbox',{name:'Pesquisar categorias'}).fill(prefix);await page.locator('categories-admin form.search-bar button').click();
 let dialog=await open(page,a+' › Som','Renomear');await dialog.getByLabel('Novo nome').fill('Áudio');
 await dialog.getByRole('button',{name:'Gerar prévia',exact:true}).click();await expect(dialog.getByRole('region',{name:'Prévia da alteração'})).toContainText('1 produtos preservados');
 await dialog.getByLabel('Novo nome').fill('Áudio final');await expect(dialog.getByRole('button',{name:'Confirmar alteração'})).toHaveCount(0);
 await confirm(dialog);await expect(categoryRow(page,a+' › Áudio final')).toBeVisible();
 dialog=await open(page,a+' › Áudio final','Mover');await dialog.getByRole('combobox').selectOption(third.category_ids[0]);await confirm(dialog);await expect(categoryRow(page,c+' › Áudio final')).toBeVisible();
 dialog=await open(page,c+' › Áudio final','Unir');await dialog.getByRole('combobox').selectOption(second.category_ids.at(-1));await confirm(dialog);await expect(categoryRow(page,c+' › Áudio final')).toHaveCount(0);await expect(categoryRow(page,b+' › Fones')).toContainText('2');
 dialog=await open(page,b,'Excluir');await dialog.getByRole('button',{name:'Gerar prévia',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Escolha um destino');await expect(dialog).toBeVisible();
 await dialog.getByRole('combobox').selectOption(third.category_ids[0]);await confirm(dialog);await expect(categoryRow(page,b)).toHaveCount(0);
 for(const product of [first,second]){const r=await page.request.get('/api/products/'+product.id);expect(r.status()).toBe(200);expect((await r.json()).category_path).toEqual([c]);}
 await create(page,Array.from({length:9},(_,i)=>prefix+' Nível '+i));await page.getByRole('textbox',{name:'Pesquisar categorias'}).fill(prefix);await page.locator('categories-admin form.search-bar button').click();
 await page.getByRole('navigation',{name:'Categorias',exact:true}).getByRole('combobox').selectOption('5');await expect(page.locator('categories-admin tbody tr')).toHaveCount(5);
 await page.getByRole('navigation',{name:'Categorias',exact:true}).getByRole('button',{name:'Próxima →'}).click();await expect(page.locator('categories-admin tbody tr')).toHaveCount(5);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/categories-mobile.png',fullPage:true});
});

test('alteração concorrente invalida prévia e cancelar não altera categoria',async({page})=>{
 await login(page);const root='ConflitoCat '+Date.now();await create(page,[root]);await page.goto('/admin/categories');
 await page.getByRole('textbox',{name:'Pesquisar categorias'}).fill(root);await page.locator('categories-admin form.search-bar button').click();
 const dialog=await open(page,root,'Renomear');await dialog.getByLabel('Novo nome').fill(root+' alterada');await dialog.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(dialog.getByRole('region',{name:'Prévia da alteração'})).toBeVisible();
 await create(page,['Concorrente '+Date.now()]);await dialog.getByRole('button',{name:'Confirmar alteração'}).click();
 await expect(page.getByRole('alert')).toContainText('mudou desde a prévia');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Confirmar alteração'})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await expect(categoryRow(page,root)).toBeVisible();
});

test('falhas de listagem, opções e gravação permitem tentar novamente sem perder o formulário',async({page})=>{
 await login(page);const root='RecuperaçãoCat '+Date.now();await create(page,[root]);
 let listFailure=true;
 await page.route('**/api/admin/categories?**',async route=>{if(listFailure){listFailure=false;await route.fulfill({status:503,json:{error:'Falha de listagem simulada'}});}else await route.continue();});
 await page.goto('/admin/categories');await expect(page.locator('categories-admin')).toContainText('Não foi possível carregar as categorias');await page.locator('categories-admin').getByRole('button',{name:'Tentar novamente'}).click();
 await page.getByRole('textbox',{name:'Pesquisar categorias'}).fill(root);await page.locator('categories-admin form.search-bar button').click();
 let optionFailure=true;
 await page.route('**/api/admin/category-tree',async route=>{if(optionFailure){optionFailure=false;await route.fulfill({status:503,json:{error:'Falha de opções simulada'}});}else await route.continue();});
 const dialog=await open(page,root,'Renomear');await expect(dialog).toContainText('Não foi possível carregar as opções de destino');await dialog.getByRole('button',{name:'Carregar opções novamente'}).click();
 await dialog.getByLabel('Novo nome').fill(root+' corrigida');await dialog.getByRole('button',{name:'Gerar prévia',exact:true}).click();await expect(dialog.getByRole('region',{name:'Prévia da alteração'})).toBeVisible();
 let saveFailure=true;
 await page.route('**/api/admin/categories/apply',async route=>{if(saveFailure){saveFailure=false;await route.fulfill({status:503,json:{error:'Falha de gravação simulada'}});}else await route.continue();});
 await dialog.getByRole('button',{name:'Confirmar alteração'}).click();await expect(dialog.getByLabel('Novo nome')).toHaveValue(root+' corrigida');await expect(dialog.getByRole('button',{name:'Confirmar alteração'})).toHaveCount(0);
 await confirm(dialog);await expect(categoryRow(page,root+' corrigida')).toBeVisible();
});
