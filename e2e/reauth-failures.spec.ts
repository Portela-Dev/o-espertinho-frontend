import {test,expect,type Page} from './coverage';

async function enterAdmin(page:Page){
 await page.addInitScript(()=>{
  let options:any;
  (window as any).google={accounts:{id:{
   initialize(value:any){options=value;},
   renderButton(element:HTMLElement){
    const button=document.createElement('button');button.textContent='Google confirmação';
    button.onclick=()=>options.callback({credential:'admin',select_by:'btn'});element.replaceChildren(button);
   },cancel(){},disableAutoSelect(){},
  }}};
 });
 await page.goto('/entrar');await page.getByRole('button',{name:'Google confirmação'}).click();
 await page.goto('/admin/profiles');
}
async function createProfile(page:Page,name:string){
 await page.getByRole('button',{name:/Novo perfil/}).click();
 const dialog=page.getByRole('dialog').filter({hasText:'Novo perfil'});
 await dialog.getByLabel('Nome',{exact:true}).fill(name);
 await dialog.getByRole('button',{name:'Salvar perfil'}).click();
}
async function requireConfirmation(page:Page){
 const attempts={count:0};
 await page.route('**/api/admin/access-profiles',async route=>{
  if(route.request().method()!=='POST'){await route.continue();return;}
  attempts.count++;
  await route.fulfill({status:403,json:{code:'ADMIN_REAUTH_REQUIRED',error:'Confirme sua conta.'}});
 });
 await page.route('**/api/auth/reauth/challenge',route=>route.fulfill({json:{nonce:'nonce-test'}}));
 return attempts;
}
test('cancelar confirmação não repete nem publica a alteração administrativa',async({page})=>{
 await enterAdmin(page);const attempts=await requireConfirmation(page);
 await createProfile(page,'Perfil cancelado');
 const confirmation=page.getByRole('dialog').filter({hasText:'Confirme sua conta'});
 await confirmation.getByRole('button',{name:'Cancelar'}).click();
 await expect(confirmation).toHaveCount(0);
 await expect(page.locator('.toast.error')).toContainText('Confirmação de segurança cancelada');
 expect(attempts.count).toBe(1);
});
test('falha no desafio é apresentada sem abrir confirmação ou repetir a escrita',async({page})=>{
 await enterAdmin(page);const attempts=await requireConfirmation(page);
 await page.route('**/api/auth/reauth/challenge',route=>route.fulfill({status:503,json:{error:'Confirmação indisponível'}}));
 await createProfile(page,'Perfil desafio falhou');
 await expect(page.locator('.toast.error')).toBeVisible();
 await expect(page.getByRole('dialog').filter({hasText:'Confirme sua conta'})).toHaveCount(0);
 expect(attempts.count).toBe(1);
});
test('credencial rejeitada mantém a confirmação aberta e permite cancelamento',async({page})=>{
 await enterAdmin(page);const attempts=await requireConfirmation(page);
 await page.route('**/api/auth/reauth',route=>route.fulfill({status:403,json:{error:'Conta diferente'}}));
 await createProfile(page,'Perfil conta rejeitada');
 const confirmation=page.getByRole('dialog').filter({hasText:'Confirme sua conta'});
 await confirmation.getByRole('button',{name:'Google confirmação'}).click();
 await expect(confirmation.getByRole('alert')).toContainText('Use a mesma conta conectada');
 expect(attempts.count).toBe(1);
 await confirmation.getByRole('button',{name:'Cancelar'}).click();
 await expect(confirmation).toHaveCount(0);
});
test('sair em outra aba cancela a operação que aguardava confirmação',async({page,context})=>{
 await enterAdmin(page);const attempts=await requireConfirmation(page);
 await createProfile(page,'Perfil saída durante confirmação');
 const confirmation=page.getByRole('dialog').filter({hasText:'Confirme sua conta'});
 await expect(confirmation).toBeVisible();
 const other=await context.newPage();await other.goto('/minha-conta');
 await other.getByRole('button',{name:'Sair da conta',exact:true}).click();
 await expect(confirmation).toHaveCount(0);
 expect(attempts.count).toBe(1);await other.close();
});
