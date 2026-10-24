import {test,expect,Page,APIRequestContext} from './coverage';

const origin=process.env['E2E_BASE_URL']||'http://localhost:4200';
async function login(page:Page,credential='admin'){
 await page.addInitScript(credential=>{(window as any).google={accounts:{id:{initialize(options:any){(window as any).navLogin=options.callback;},renderButton(el:HTMLElement){const button=document.createElement('button');button.textContent='Login de teste';button.onclick=()=>(window as any).navLogin({credential});el.appendChild(button);}}}};},credential);
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);
}
async function send(context:APIRequestContext,path:string,body:any,method='POST'){
 await context.get('/api/auth/session');const state=await context.storageState();const token=state.cookies.find(cookie=>cookie.name==='XSRF-TOKEN')!.value;
 return context.fetch('/api'+path,{method,headers:{Origin:origin,'X-XSRF-TOKEN':token},data:body});
}

test('admin has ten groups, a single execution screen and one offer management list',async({page})=>{
 await login(page);await page.goto('/admin');const nav=page.getByRole('navigation',{name:'Administração'});
 await expect(nav.getByRole('link')).toHaveText(['Visão geral','Revisão','Ofertas','Produtos','Categorias','Marketplaces','Execuções','Acessos','Manutenção','Atividade']);
 await nav.getByRole('link',{name:'Marketplaces',exact:true}).click();const market=page.getByRole('navigation',{name:'Configurações de marketplaces'});
 await expect(market.getByRole('link')).toHaveText(['Cadastro','Exploração','Seletores']);
 await market.getByRole('link',{name:'Exploração',exact:true}).click();await expect(page).toHaveURL(/\/admin\/discovery$/);await expect(page.locator('catalog-operations')).toHaveCount(0);
 await page.getByRole('button',{name:'Nova página de seção'}).click();await expect(page.getByRole('dialog').getByLabel('Intervalo entre ciclos')).toHaveCount(0);await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await nav.getByRole('link',{name:'Revisão',exact:true}).click();await expect(page.locator('enrichment-admin')).toBeVisible();await expect(page.locator('catalog-operations')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Ofertas cadastradas'})).toHaveCount(0);
 await nav.getByRole('link',{name:'Ofertas',exact:true}).click();await expect(page.getByRole('heading',{name:'Ofertas cadastradas'})).toBeVisible();await expect(page.locator('catalog-admin')).toHaveCount(0);
 await page.getByRole('button',{name:'Cadastrar oferta'}).click();await expect(page.locator('catalog-admin')).toHaveCount(1);await expect(page.getByRole('heading',{name:'Links cadastrados'})).toHaveCount(0);
 await page.goto('/admin/links?status=expired');await expect(page.getByRole('combobox',{name:'Exibir ofertas',exact:true})).toHaveValue('expired');
 await nav.getByRole('link',{name:'Produtos',exact:true}).click();const row=page.locator('products-admin tbody tr').first();await row.getByRole('button',{name:'Ações do produto'}).click();const shortcut=row.getByRole('link',{name:'Cadastrar link'}),url=new URL((await shortcut.getAttribute('href'))!,origin),product=url.searchParams.get('product')!;await shortcut.click();await expect(page.getByRole('heading',{name:'Cadastro manual de oferta'})).toBeVisible();await expect(page.getByRole('combobox',{name:'Produto',exact:true})).toHaveValue(product);
 await nav.getByRole('link',{name:'Execuções',exact:true}).click();await expect(page.locator('catalog-operations')).toHaveCount(1);
 await nav.getByRole('link',{name:'Acessos',exact:true}).click();await expect(page.getByRole('navigation',{name:'Gestão de acessos'}).getByRole('link')).toHaveText(['Usuários','Perfis de acesso']);
});

for(const item of [
 {permission:'selectors',first:'selectors',labels:['Marketplaces'],marketPath:'/admin/selectors'},
 {permission:'discovery',first:'discovery',labels:['Marketplaces','Execuções'],marketPath:'/admin/discovery'},
 {permission:'updates',first:'updates',labels:['Execuções'],marketPath:null},
 {permission:'catalog',first:'products',labels:['Revisão','Ofertas','Produtos','Categorias','Execuções'],marketPath:null}
]){
 test('grouped navigation preserves the '+item.permission+' permission in isolation',async({page,playwright})=>{
  const admin=await playwright.request.newContext({baseURL:origin}),member=await playwright.request.newContext({baseURL:origin});const credential='nav-'+item.permission;
  await send(admin,'/auth/google',{credential:'admin'});const {user}=await (await send(member,'/auth/google',{credential})).json();
  const profile=await send(admin,'/admin/access-profiles',{name:'Navegação '+item.permission,permissions:[item.permission]});expect(profile.status()).toBe(201);const {id}=await profile.json();
  expect((await send(admin,'/admin/users/'+user.id,{profileId:id,blocked:false,expectedProfileId:user.access_profile_id,expectedBlocked:false},'PATCH')).status()).toBe(200);
  await admin.dispose();await member.dispose();const forbidden:string[]=[];page.on('response',response=>{if(response.status()===403)forbidden.push(response.url());});
  await login(page,credential);await page.goto('/admin');await expect(page).toHaveURL(new RegExp('/admin/'+item.first+'$'));const nav=page.getByRole('navigation',{name:'Administração'});await expect(nav.getByRole('link')).toHaveText(item.labels);
  if(item.marketPath){await expect(nav.getByRole('link',{name:'Marketplaces',exact:true})).toHaveAttribute('href',item.marketPath);await expect(page.getByRole('navigation',{name:'Configurações de marketplaces'}).getByRole('link')).toHaveCount(1);}
  if(item.labels.includes('Execuções')){await nav.getByRole('link',{name:'Execuções',exact:true}).click();await expect(page.locator('catalog-operations')).toBeVisible();await expect(page.locator('catalog-operations')).toContainText('Execuções pela extensão');}
  expect(forbidden).toEqual([]);await page.goto('/admin/users');await expect(page).toHaveURL(new RegExp('/admin/'+item.first+'$'));expect((await page.request.get('/api/admin/users')).status()).toBe(403);
 });
}
