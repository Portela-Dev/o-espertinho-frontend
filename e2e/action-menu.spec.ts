import {test,expect,Page} from './coverage';

async function login(page:Page){
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(options:any){(window as any).menuLogin=options.callback;},renderButton(el:HTMLElement){const button=document.createElement('button');button.textContent='Login de teste';button.onclick=()=>(window as any).menuLogin({credential:'admin'});el.appendChild(button);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Login de teste'}).click();await expect(page).not.toHaveURL(/entrar/);
}

test('shared actions float outside the table, close consistently and fit mobile in dark mode',async({page})=>{
 await page.route('**/api/admin/products?**',route=>route.fulfill({json:{items:[1,2].map(n=>({id:'menu-product-'+n,name:'Produto menu '+n,sku:'TEST-'+n,brand:'Teste',model:'',description:'',category_path:['Teste'],link_count:0,available_count:0})),total:2,page:1,pageSize:20}}));
 await login(page);await page.goto('/admin/products');
 const row=page.getByRole('row').filter({hasText:'Produto menu 1'}),trigger=row.getByRole('button',{name:'Ações do produto'}),menu=row.getByRole('group',{name:'Ações do produto'});
 const height=(await row.boundingBox())!.height;
 await expect(row.getByRole('button',{name:'Editar produto'})).toBeHidden();
 await trigger.focus();await page.keyboard.press('Enter');await expect(menu).toBeVisible();
 expect((await row.boundingBox())!.height).toBe(height);
 await expect(menu.getByRole('link',{name:'Cadastrar link'})).toHaveAttribute('href','/admin/links?product=menu-product-1');
 await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();const second=page.getByRole('row').filter({hasText:'Produto menu 2'});await second.getByRole('button',{name:'Ações do produto'}).click();await expect(menu).toBeHidden();await expect(second.getByRole('group',{name:'Ações do produto'})).toBeVisible();
 await page.getByRole('heading',{name:'Produtos',exact:true}).click();await expect(second.getByRole('group',{name:'Ações do produto'})).toBeHidden();
 await trigger.click();await row.locator('app-action-menu').evaluate(el=>el.closest('.table-wrap')!.dispatchEvent(new Event('scroll')));await expect(menu).toBeVisible();await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
 await trigger.click();await expect(menu).toBeVisible();await expect.poll(async()=>{const b=await menu.boundingBox();return !!b&&b.x>=0&&b.y>=0&&b.x+b.width<=390&&b.y+b.height<=844;}).toBe(true);
 await page.screenshot({path:'test-results/admin-actions-mobile-dark.png'});
 await menu.getByRole('button',{name:'Editar produto'}).click();await expect(menu).toBeHidden();await expect(page.getByRole('dialog')).toContainText('Editar produto');
});

test('user menu preserves the restriction against editing your own access',async({page})=>{
 await login(page);const {user}=await (await page.request.get('/api/auth/session')).json();
 await page.route('**/api/admin/users?**',route=>route.fulfill({json:{items:[{...user,profile_name:'Administrador',created_at:new Date().toISOString()}],total:1,page:1,pageSize:25}}));
 await page.goto('/admin/users');const row=page.getByRole('row').filter({hasText:user.email});
 await row.getByRole('button',{name:'Ações do usuário'}).click();await expect(row.getByRole('button',{name:'Gerenciar acesso'})).toBeDisabled();
 await expect(row).toContainText('Sua conta');await page.keyboard.press('Escape');await expect(row.getByRole('group',{name:'Ações do usuário'})).toBeHidden();
});
