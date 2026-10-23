import {chooseAction} from './actions';
import {test,expect,Page} from './coverage';
async function login(page:Page,token='admin'){
 await page.addInitScript(credential=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).callback=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Login de teste';b.onclick=()=>(window as any).callback({credential});el.appendChild(b);}}}};},token);
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);
}
async function openProfiles(page:Page){await page.goto('/admin/discovery');await page.getByRole('button',{name:'Perfis de exploração',exact:true}).click();}
async function newProfile(page:Page,name:string,mode='url'){
 await page.getByRole('button',{name:'Novo perfil',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome',{exact:true}).fill(name);await dialog.getByRole('combobox',{name:'Marketplace',exact:true}).selectOption('amazon');await dialog.getByLabel('Seletor dos itens da listagem',{exact:false}).fill('.product-card');await dialog.getByLabel('Como a página avança').selectOption(mode);
 if(mode==='url')await dialog.getByLabel('Modelo de URL').fill('https://www.amazon.com.br/s?k=monitor&page={page}');
 if(['next','load_more'].includes(mode))await dialog.getByLabel('Seletor de próxima página / carregar mais').fill('a.next');
 return dialog;
}

test('exploração persiste perfil e seção, edita configurações, protege perfil em uso e exclui com confirmação',async({page})=>{
 await login(page);await openProfiles(page);const dialog=await newProfile(page,'Perfil E2E completo');
 await expect(dialog.getByRole('group',{name:'Categoria de origem na vitrine',exact:true})).toHaveCount(0);await expect(dialog.getByRole('group',{name:'Localização dos cards e links na vitrine',exact:true}).getByRole('textbox')).toHaveCount(3);await dialog.getByLabel('Intervalo mínimo entre requisições (ms)').fill('100');
 await dialog.locator('.failure-rule').filter({hasText:'Falha de navegação ou HTTP'}).getByLabel('Ação após esgotar as tentativas').selectOption('skip_page');
 await dialog.getByRole('button',{name:'Salvar configuração'}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('discovery-admin tbody')).toContainText('Perfil E2E completo');
 const profiles=await (await page.request.get('/api/admin/discovery/profiles?q=Perfil%20E2E%20completo')).json();const profile=profiles.items[0];expect(profile.config.limits.requestIntervalMs).toBe(100);expect(profile.config.failures.navigation.action).toBe('skip_page');
 await page.getByRole('button',{name:'Páginas de seção',exact:true}).click();await page.getByRole('button',{name:'Nova página de seção'}).click();let source=page.getByRole('dialog');await source.getByLabel('Nome',{exact:true}).fill('Monitores E2E');await source.getByRole('combobox',{name:'Marketplace',exact:true}).selectOption('amazon');await source.getByLabel('Perfil de exploração',{exact:false}).selectOption(profile.id);await source.getByLabel('URL da página de seção').fill('https://www.amazon.com.br/s?k=monitor#top');await source.getByLabel('Categoria de origem alternativa').fill('Informática\nMonitores');await source.getByLabel('Habilitar para exploração').check();await expect(source.getByLabel('Intervalo entre ciclos')).toHaveCount(0);await source.getByLabel('Observações').fill('Configuração sem job.');await source.getByRole('button',{name:'Salvar configuração'}).click();await expect(source).toHaveCount(0);await expect(page.locator('discovery-admin tbody')).toContainText('Monitores E2E');
 await page.reload();await expect(page.locator('discovery-admin tbody')).toContainText('Informática › Monitores');const row=page.locator('discovery-admin tbody tr').filter({hasText:'Monitores E2E'});await chooseAction(row,'Editar');source=page.getByRole('dialog');await expect(source.getByLabel('URL da página de seção')).toHaveValue('https://www.amazon.com.br/s?k=monitor');await expect(source.getByLabel('Habilitar para exploração')).toBeChecked();await source.getByLabel('Habilitar para exploração').uncheck();await source.getByRole('button',{name:'Salvar configuração'}).click();await expect(row).toContainText('Desabilitado');
 await page.getByRole('button',{name:'Perfis de exploração',exact:true}).click();let profileRow=page.locator('discovery-admin tbody tr').filter({hasText:'Perfil E2E completo'});await chooseAction(profileRow,'Excluir');await page.getByRole('alertdialog').getByRole('button',{name:'Excluir',exact:true}).click();await expect(page.getByRole('alert')).toContainText('vinculado');await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar'}).click();
 await chooseAction(profileRow,'Editar');const edit=page.getByRole('dialog');await edit.getByLabel('Como a página avança').selectOption('next');await edit.getByLabel('Seletor de próxima página / carregar mais').fill('button.next');await edit.getByRole('button',{name:'Salvar configuração'}).click();await expect(profileRow).toContainText('próxima página');
 await page.getByRole('button',{name:'Páginas de seção',exact:true}).click();await chooseAction(page.locator('discovery-admin tbody tr').filter({hasText:'Monitores E2E'}),'Excluir');await page.getByRole('alertdialog').getByRole('button',{name:'Excluir',exact:true}).click();await expect(page.locator('discovery-admin tbody tr').filter({hasText:'Monitores E2E'})).toHaveCount(0);await page.getByRole('button',{name:'Perfis de exploração',exact:true}).click();profileRow=page.locator('discovery-admin tbody tr').filter({hasText:'Perfil E2E completo'});await chooseAction(profileRow,'Excluir');await page.getByRole('alertdialog').getByRole('button',{name:'Excluir',exact:true}).click();await expect(profileRow).toHaveCount(0);
});

test('formulário adapta os controles de paginação e mantém o mobile sem transbordamento',async({page})=>{
 await login(page);await openProfiles(page);const dialog=await newProfile(page,'Perfil visual','single');await expect(dialog.getByLabel('Seletor de próxima página / carregar mais')).toHaveCount(0);
 for(const mode of ['next','load_more','url','scroll','single']){
  await dialog.getByLabel('Como a página avança').selectOption(mode);
  if(['next','load_more'].includes(mode))await expect(dialog.getByLabel('Seletor de próxima página / carregar mais')).toBeVisible();
  if(mode==='url')await expect(dialog.getByLabel('Modelo de URL')).toBeVisible();
  if(mode==='scroll'){
   await expect(dialog.getByLabel('Deslocamento por rolagem')).toBeVisible();
   await dialog.getByLabel('Estratégia de rolagem').selectOption('bottom');await expect(dialog.getByLabel('Deslocamento por rolagem')).toHaveCount(0);
   await dialog.getByLabel('Estratégia de rolagem').selectOption('step');await expect(dialog.getByLabel('Deslocamento por rolagem')).toBeVisible();
  }
 }
 await dialog.getByLabel('Como a página avança').selectOption('scroll');await dialog.getByLabel('Estratégia de rolagem').selectOption('bottom');await dialog.getByRole('button',{name:'Salvar configuração'}).click();await expect(dialog).toHaveCount(0);
 const saved=(await (await page.request.get('/api/admin/discovery/profiles?q=Perfil%20visual')).json()).items[0];expect(saved.config.pagination.scrollStrategy).toBe('bottom');
 await chooseAction(page.locator('discovery-admin tbody tr').filter({hasText:'Perfil visual'}),'Editar');await expect(dialog.getByLabel('Estratégia de rolagem')).toHaveValue('bottom');
 await page.setViewportSize({width:390,height:844});await dialog.getByLabel('Nome',{exact:true}).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/discovery-mobile.png'});await page.setViewportSize({width:1440,height:1080});await page.screenshot({path:'test-results/discovery-desktop.png'});await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);
});

test('listas de exploração têm filtros e tamanho de página; erros de gravação mantêm os dados do formulário',async({page})=>{
 await login(page);await page.route('**/api/admin/discovery/profiles?**',async route=>{const u=new URL(route.request().url()),size=Number(u.searchParams.get('pageSize')),p=Number(u.searchParams.get('page'));await route.fulfill({json:{items:Array.from({length:p===1?size:1},(_,i)=>({id:'profile-'+p+'-'+i,name:'Perfil paginado '+i,marketplace_name:'Amazon',marketplace_id:'amazon',version:1,config:{pagination:{mode:'single'}}})),total:21,page:p,pageSize:size}});});
 await openProfiles(page);const pager=page.getByRole('navigation',{name:'Configurações de exploração',exact:true});await expect(page.locator('discovery-admin tbody tr')).toHaveCount(20);await pager.getByRole('button',{name:'Próxima'}).click();await expect(page.locator('discovery-admin tbody tr')).toHaveCount(1);await pager.getByRole('combobox').selectOption('5');await expect(page.locator('discovery-admin tbody tr')).toHaveCount(5);
 await page.locator('.discovery-filters').getByLabel('Marketplace').selectOption('amazon');await page.locator('.discovery-filters').getByLabel('Buscar por nome').fill('monitor');const request=page.waitForRequest(r=>r.url().includes('/discovery/profiles?')&&r.url().includes('q=monitor'));await page.getByRole('button',{name:'Filtrar',exact:true}).click();expect((await request).url()).toContain('marketplaceId=amazon');
 const dialog=await newProfile(page,'Perfil com erro','single');await page.route('**/api/admin/discovery/profiles',route=>route.fulfill({status:400,json:{error:'Confira os campos preenchidos.',fields:[{field:'config.extraction.itemSelector',message:'Seletor inválido'}]}}));await dialog.getByRole('button',{name:'Salvar configuração'}).click();await expect(dialog.getByRole('alert')).toContainText('Seletor inválido');await expect(dialog.getByLabel('Nome',{exact:true})).toHaveValue('Perfil com erro');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
});

test('falhas de carregamento permitem nova tentativa e usuários sem permissão não acessam a configuração',async({page})=>{
 await login(page);let failed=true;await page.route('**/api/admin/discovery/defaults',async route=>{if(failed){failed=false;await route.fulfill({status:503,json:{error:'Falha temporária'}});}else await route.continue();});await page.goto('/admin/discovery');await expect(page.getByRole('heading',{name:'Não foi possível carregar as configurações'})).toBeVisible();await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.getByRole('button',{name:'Nova página de seção'})).toBeVisible();
 await page.route('**/api/admin/discovery/sources?**',route=>route.fulfill({status:503,json:{error:'Lista indisponível'}}));await page.locator('.discovery-filters').getByRole('button',{name:'Filtrar'}).click();await expect(page.locator('discovery-admin')).toContainText('Não foi possível carregar a lista.');await page.unroute('**/api/admin/discovery/sources?**');await page.locator('discovery-admin').getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.locator('discovery-admin')).not.toContainText('Não foi possível carregar a lista.');
 await page.context().clearCookies();await login(page,'common-discovery');await page.goto('/admin/discovery');await expect(page).toHaveURL(/\/$/);expect((await page.request.get('/api/admin/discovery/profiles')).status()).toBe(403);
});


test('backdrop fecha modais sem confundir cliques internos, arrastos e gravações em andamento',async({page})=>{
 await login(page);await openProfiles(page);
 let dialog=await newProfile(page,'Perfil backdrop','single');
 await dialog.getByRole('heading',{level:2}).click();await expect(dialog).toBeVisible();
 const input=await dialog.getByLabel('Nome',{exact:true}).boundingBox();
 await page.mouse.move(input!.x+20,input!.y+10);await page.mouse.down();await page.mouse.move(3,3);await page.mouse.up();await expect(dialog).toBeVisible();
 await page.mouse.click(3,3);await expect(dialog).toHaveCount(0);
 dialog=await newProfile(page,'Perfil gravação','single');
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/admin/discovery/profiles',async route=>{if(route.request().method()!=='POST'){await route.continue();return;}await pending;await route.fulfill({status:400,json:{error:'Falha controlada para testar a modal.'}});});
 await dialog.getByRole('button',{name:'Salvar configuração'}).click();
 await expect(dialog.getByRole('button',{name:'Salvando…'})).toBeDisabled();
 await page.mouse.click(3,3);await expect(dialog).toBeVisible();
 release();await expect(dialog.getByRole('button',{name:'Salvar configuração'})).toBeEnabled();
 await page.mouse.click(3,3);await expect(dialog).toHaveCount(0);
 for(const [url,button] of [['/admin/products','Novo produto'],['/admin/marketplaces','Novo marketplace']]){
  await page.goto(url);await page.getByRole('button',{name:new RegExp(button+'$')}).click();dialog=page.getByRole('dialog');await dialog.getByRole('heading',{level:2}).click();await expect(dialog).toBeVisible();await page.mouse.click(3,3);await expect(dialog).toHaveCount(0);
 }
 await page.goto('/');const history=page.locator('price-history-chart').first();await history.getByRole('button',{name:/Ampliar histórico/}).click();
 const chart=page.getByRole('dialog');await chart.getByRole('heading',{name:'Histórico de preços',exact:true}).click();await expect(chart).toBeVisible();
 await page.mouse.click(3,3);await expect(chart).not.toBeVisible();
});
