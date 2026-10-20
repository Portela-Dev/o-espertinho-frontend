import {chooseAction} from './actions';
import {test,expect,Page,APIRequestContext} from './coverage';
const origin=process.env['E2E_BASE_URL']||'http://localhost:4200';
async function login(page:Page,token='admin'){
 await page.addInitScript(credential=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).__accessLogin=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Google acesso teste';b.onclick=()=>(window as any).__accessLogin({credential});el.appendChild(b);}}}};},token);
 await page.goto('/entrar');await page.getByRole('button',{name:'Google acesso teste'}).click();await expect(page.getByRole('link',{name:/Conta de Pessoa/})).toBeVisible();
}
async function send(context:APIRequestContext,path:string,body:any,method='POST'){
 await context.get('/api/auth/session');const state=await context.storageState(),csrf=state.cookies.find(c=>c.name==='XSRF-TOKEN')!.value;
 return context.fetch('/api'+path,{method,headers:{Origin:origin,'X-XSRF-TOKEN':csrf},data:body});
}
test('admin cria perfil, atribui ao usuário, bloqueia e desbloqueia a conta',async({page,playwright})=>{
 const profileName='Operação E2E '+Date.now();const visitor=await playwright.request.newContext({baseURL:origin});await send(visitor,'/auth/google',{credential:'access-member'});await visitor.dispose();
 await login(page);await page.goto('/admin/profiles');await page.getByRole('button',{name:'Novo perfil'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome',{exact:true}).fill(profileName);await dialog.getByLabel('Atualizações de preços').check();await dialog.getByRole('button',{name:'Salvar perfil'}).click();await expect(page.getByRole('row').filter({hasText:profileName})).toBeVisible();
 await page.getByRole('link',{name:'Usuários',exact:true}).click();await page.getByLabel('Buscar por nome ou e-mail').fill('access-member');await page.getByRole('button',{name:'Buscar',exact:true}).click();
 const row=page.getByRole('row').filter({hasText:'access-member@gmail.com'});await chooseAction(row,'Gerenciar acesso');await dialog.getByRole('combobox',{name:'Perfil',exact:true}).selectOption({label:profileName});await dialog.getByRole('button',{name:'Confirmar alteração de acesso'}).click();await expect(row.getByRole('cell',{name:profileName,exact:true})).toBeVisible();
 await chooseAction(row,'Gerenciar acesso');await dialog.getByLabel('Bloquear conta').check();await dialog.getByRole('button',{name:'Confirmar alteração de acesso'}).click();await expect(row.getByText('Bloqueado',{exact:true})).toBeVisible();
 await chooseAction(row,'Gerenciar acesso');await dialog.getByLabel('Bloquear conta').uncheck();await dialog.getByRole('combobox',{name:'Perfil',exact:true}).selectOption('user');await dialog.getByRole('button',{name:'Confirmar alteração de acesso'}).click();await expect(row.getByText('Ativo',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'test-results/users-mobile.png',fullPage:true});
 await page.getByRole('link',{name:'Perfis de acesso',exact:true}).click();await chooseAction(page.getByRole('row').filter({hasText:profileName}),'Excluir');await page.getByRole('alertdialog').getByRole('button',{name:'Excluir perfil'}).click();await expect(page.getByRole('row').filter({hasText:profileName})).toHaveCount(0);
});
test('editor enxerga apenas áreas permitidas e URL direta não concede acesso',async({page,playwright})=>{
 const admin=await playwright.request.newContext({baseURL:origin}),member=await playwright.request.newContext({baseURL:origin});
 await send(admin,'/auth/google',{credential:'admin'});const user=(await (await send(member,'/auth/google',{credential:'access-editor'})).json()).user;
 expect((await send(admin,'/admin/users/'+user.id,{profileId:'editor',blocked:false,expectedProfileId:user.access_profile_id,expectedBlocked:false},'PATCH')).status()).toBe(200);await admin.dispose();await member.dispose();
 await login(page,'access-editor');await page.goto('/admin');await expect(page.getByRole('heading',{level:1})).toHaveText('Produtos');
 const nav=page.getByRole('navigation',{name:'Administração'});await expect(nav.getByRole('link',{name:'Produtos',exact:true})).toBeVisible();await expect(nav.getByRole('link',{name:'Usuários',exact:true})).toHaveCount(0);await expect(nav.getByRole('link',{name:'Marketplaces',exact:true})).toHaveCount(0);
 await page.goto('/admin/users');await expect(page).toHaveURL(/\/admin\/products$/);expect((await page.request.get('/api/admin/users')).status()).toBe(403);
});
