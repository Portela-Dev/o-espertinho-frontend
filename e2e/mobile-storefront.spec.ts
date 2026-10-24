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
 await page.goto('/');
 await expect(page.locator('product-card')).toHaveCount(1);
 await expect(page.getByRole('textbox',{name:'Buscar ofertas'})).toBeHidden();
 await expect(page.getByLabel('Preço máximo (R$)',{exact:true})).toBeHidden();
 const amazon=page.getByRole('button',{name:'Amazon',exact:true});
 await expect(amazon).toBeVisible();await expect(amazon.locator('.partner-name')).toBeHidden();
 await amazon.click();await expect(page).toHaveURL(/marketplace=amazon/);
 await amazon.click();await expect(page).not.toHaveURL(/marketplace=amazon/);
 const trigger=page.getByRole('button',{name:'Pesquisar e filtrar'});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Pesquisar e filtrar'});
 await expect(dialog).toBeVisible();await expect(trigger).toHaveAttribute('aria-expanded','true');
 await dialog.getByRole('textbox',{name:'Buscar ofertas'}).fill('Celular');
 await expect(page).toHaveURL(/q=Celular/);
 await expect(dialog).toBeVisible();
 await dialog.getByRole('combobox',{name:'Loja',exact:true}).selectOption('shopee');
 await dialog.getByLabel('Preço máximo (R$)',{exact:true}).fill('1500');
 await dialog.getByLabel('Ordenar por').selectOption('price_asc');
 await dialog.getByRole('button',{name:'Aplicar filtros'}).click();
 await expect(dialog).toBeHidden();
 await expect(page).toHaveURL(/marketplace=shopee/);await expect(page).toHaveURL(/maxPrice=150000/);await expect(page).toHaveURL(/sort=price_asc/);
 await trigger.click();await expect(dialog.getByLabel('Preço máximo (R$)',{exact:true})).toHaveValue('1500');
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.click();await page.mouse.click(2,2);await expect(dialog).toBeHidden();
 for(const width of [320,390,620]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await trigger.click();
  expect(await dialog.evaluate(e=>e.getBoundingClientRect().width<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/mobile-storefront.png',fullPage:true});
 await trigger.click();await page.screenshot({path:'test-results/mobile-search-filters.png'});
 await dialog.getByRole('button',{name:'Fechar pesquisa e filtros'}).click();
 await page.getByRole('button',{name:'Tema escuro'}).click();
 await trigger.click();await expect(dialog.getByRole('combobox',{name:'Loja',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/mobile-search-filters-dark.png'});
 await dialog.getByRole('button',{name:'Salvar este filtro'}).click();
 await expect(dialog).toBeHidden();
 await expect(page.getByRole('dialog',{name:'Salvar esta busca'})).toBeVisible();
});

test('desktop mantém busca, filtros laterais e nomes dos marketplaces',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await expect(page.getByRole('textbox',{name:'Buscar ofertas'})).toBeVisible();
 await expect(page.getByLabel('Preço máximo (R$)',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Pesquisar e filtrar'})).toBeHidden();
 await expect(page.getByRole('button',{name:'Amazon',exact:true}).locator('.partner-name')).toBeVisible();
 await page.getByRole('textbox',{name:'Buscar ofertas'}).fill('Monitor');
 await expect(page).toHaveURL(/q=Monitor/);
 await page.screenshot({path:'test-results/desktop-storefront.png',fullPage:true});
});
