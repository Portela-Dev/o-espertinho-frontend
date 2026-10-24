import {test,expect} from './coverage';

test.beforeEach(async({page})=>{
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const marketplaces=[{id:'amazon',name:'Amazon',logo_url:'',website_url:'https://www.amazon.com.br'},{id:'mercadolivre',name:'Mercado Livre',logo_url:'',website_url:'https://www.mercadolivre.com.br'},{id:'shopee',name:'Shopee',logo_url:'',website_url:'https://shopee.com.br'}];
  let json:unknown={};
  if(path==='/api/marketplaces')json=marketplaces;
  if(path==='/api/category-tree')json=[{id:'phones',path:['Celulares'],depth:1}];
  if(path==='/api/auth/session')json={user:null};
  if(path==='/api/products')json={items:[{id:'example',name:'Celular de teste',display_image_url:null,min_price_cents:120000,max_price_cents:120000,offer_count:2,marketplaces,category_path:[],category_ids:[]}],total:1,page:1,pageSize:24};
  if(path.includes('price-history'))json={points:[]};
  await route.fulfill({json});
 });
});

test('mobile reúne busca e filtros no menu e mantém marketplaces acessíveis só com ícones',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/sobre');await page.getByRole('link',{name:'O Espertinho início',exact:true}).click();
 await expect(page.locator('product-card')).toHaveCount(1);
 await expect(page.getByRole('navigation',{name:'Navegação principal',exact:true})).toBeHidden();
 const menuButton=page.getByRole('button',{name:'Abrir menu',exact:true});
 await menuButton.click();
 const navigation=page.getByRole('dialog',{name:'Menu',exact:true});
 await expect(navigation).toBeVisible();
 await expect(navigation.getByRole('link',{name:'Favoritos',exact:true})).toBeVisible();
 await expect(navigation.getByRole('link',{name:'Meus catálogos',exact:true})).toBeVisible();
 await navigation.getByRole('button',{name:'Escuro',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await navigation.getByRole('button',{name:'Claro',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.screenshot({path:'test-results/mobile-navigation.png'});
 await navigation.getByRole('link',{name:'Explorar',exact:true}).click();
 await expect(navigation).toBeHidden();
 await menuButton.click();await page.keyboard.press('Escape');
 await expect(navigation).toBeHidden();await expect(menuButton).toBeFocused();
 await expect(page.getByRole('textbox',{name:'Buscar ofertas'})).toBeHidden();
 await expect(page.getByLabel('Preço máximo (R$)',{exact:true})).toBeHidden();
 await expect(page.locator('.home-category-navigation')).toBeHidden();
 await expect(page.locator('.home-breadcrumb')).toBeHidden();
 const amazon=page.getByRole('button',{name:'Amazon',exact:true});
 await expect(amazon).toBeVisible();await expect(amazon.locator('.partner-name')).toBeHidden();
 await amazon.click();await expect(page).toHaveURL(/marketplace=amazon/);
 await amazon.click();await expect(page).not.toHaveURL(/marketplace=amazon/);
 const trigger=page.getByRole('button',{name:'Pesquisar e filtrar'});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Pesquisar e filtrar'});
 await expect(dialog).toBeVisible();await expect(trigger).toHaveAttribute('aria-expanded','true');
 await dialog.getByRole('combobox',{name:'Categoria',exact:true}).selectOption('phones');
 await expect(page).toHaveURL(/categoryId=phones/);
 await dialog.getByRole('textbox',{name:'Buscar ofertas'}).fill('Celular');
 await expect(page).toHaveURL(/q=Celular/);
 await expect(dialog).toBeVisible();
 await dialog.getByRole('combobox',{name:'Loja',exact:true}).selectOption('shopee');
 await dialog.getByLabel('Preço máximo (R$)',{exact:true}).fill('1500');
 await dialog.getByLabel('Ordenar por').selectOption('price_asc');
 await dialog.getByRole('button',{name:'Aplicar filtros'}).click();
 await expect(dialog).toBeHidden();
 await expect(page.locator('.home-breadcrumb')).toBeVisible();
 await expect(page).toHaveURL(/marketplace=shopee/);await expect(page).toHaveURL(/maxPrice=150000/);await expect(page).toHaveURL(/sort=price_asc/);
 await trigger.click();await expect(dialog.getByLabel('Preço máximo (R$)',{exact:true})).toHaveValue('1500');
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();await page.mouse.click(2,2);await expect(dialog).toBeHidden();
 for(const width of [320,390,620]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.header-inner').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(85);
  await expect(page.locator('.header-inner .theme-toggle')).toBeHidden();
  await expect(page.getByRole('navigation',{name:'Navegação principal',exact:true})).toBeHidden();
  await trigger.click();
  expect(await dialog.evaluate(e=>e.getBoundingClientRect().width<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/mobile-storefront.png',fullPage:true});
 await trigger.click();await page.screenshot({path:'test-results/mobile-search-filters.png'});
 await dialog.getByRole('button',{name:'Fechar pesquisa e filtros'}).click();
 await menuButton.click();
 await navigation.getByRole('button',{name:'Escuro',exact:true}).click();
 await navigation.getByRole('button',{name:'Fechar menu',exact:true}).click();
 await trigger.click();await expect(dialog.getByRole('combobox',{name:'Loja',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/mobile-search-filters-dark.png'});
 await dialog.getByRole('button',{name:'Salvar este filtro'}).click();
 await expect(dialog).toBeHidden();
 await expect(page.getByRole('dialog',{name:'Salvar esta busca'})).toBeVisible();
});

test('desktop mantém busca, filtros laterais e nomes dos marketplaces',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/sobre');await page.getByRole('link',{name:'O Espertinho início',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Buscar ofertas'})).toBeVisible();
 await expect(page.getByLabel('Preço máximo (R$)',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Pesquisar e filtrar'})).toBeHidden();
 await expect(page.getByRole('navigation',{name:'Navegação principal',exact:true})).toBeVisible();
 await expect(page.locator('.home-category-navigation')).toBeVisible();
 await expect(page.getByRole('button',{name:'Abrir menu',exact:true})).toBeHidden();
 await expect(page.getByRole('button',{name:'Amazon',exact:true}).locator('.partner-name')).toBeVisible();
 await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('Monitor');
 await expect(page).toHaveURL(/q=Monitor/);
 await page.screenshot({path:'test-results/desktop-storefront.png',fullPage:true});
});


test('menu mobile preserva foto, nome e acesso à conta do usuário conectado',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/auth/session',route=>route.fulfill({json:{user:{id:'test-user',name:'Pessoa de Teste',email:'teste@example.com',avatar:'https://example.com/profile.png',role:'user'}}}));
 await page.route('**/api/me/favorites',route=>route.fulfill({json:[]}));
 await page.route('https://example.com/profile.png',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="#173a2b"/></svg>'}));
 await page.goto('/sobre');await page.getByRole('link',{name:'O Espertinho início',exact:true}).click();
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'Menu',exact:true});
 const account=menu.getByRole('link',{name:'Conta de Pessoa de Teste',exact:true});
 await expect(account).toBeVisible();
 await expect(account.getByRole('img',{name:'Foto de perfil de Pessoa de Teste'})).toBeVisible();
 await expect(account.locator('img')).toHaveAttribute('src','https://example.com/profile.png');
 await expect(account).toContainText('Pessoa de Teste');
 await expect(menu.getByRole('link',{name:'Entrar',exact:true})).toHaveCount(0);
 await page.screenshot({path:'test-results/mobile-menu-profile.png'});
 await account.click();await expect(page).toHaveURL(/minha-conta/);await expect(menu).toBeHidden();
});
