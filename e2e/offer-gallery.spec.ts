import {test,expect} from './coverage';

for(const mobile of [false,true])test(`galeria abre na foto escolhida, navega e fecha sem nova aba — ${mobile?'mobile':'desktop'}`,async({page,context})=>{
 await page.setViewportSize({width:mobile?375:1320,height:900});
 await page.route('https://images.example.com/*',route=>{const portrait=route.request().url().endsWith('2.svg'),w=portrait?200:800,h=portrait?800:200;return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#cef58c"/><rect width="100%" height="20" fill="#173a2b"/><rect y="${h-20}" width="100%" height="20" fill="#b56c0b"/></svg>`});});
 await page.goto('/');
 const squareImage=async(selector:string)=>{
  const visual=page.locator(selector).first();await expect(visual).toBeVisible();
  const bounds=await visual.boundingBox();expect(Math.abs(bounds!.width-bounds!.height)).toBeLessThan(1);
  await expect(visual.locator('img')).toHaveCSS('object-fit','contain');
  const image=await visual.locator('img').boundingBox();expect(image!.width).toBeCloseTo(bounds!.width,0);expect(image!.height).toBeCloseTo(bounds!.height,0);
 };
 await squareImage('product-card .product-visual');await page.locator('product-card .card-cta').first().click();
 await squareImage('offer-card .product-visual');
 const link=page.locator('offer-card h3 a').first(),href=await link.getAttribute('href');
 const id=href!.split('/').at(-1);
 await page.route('**/api/offers/'+id,async route=>{const response=await route.fetch(),offer=await response.json();await route.fulfill({json:{...offer,images:['https://images.example.com/1.svg','https://images.example.com/2.svg','https://images.example.com/3.svg']}});});
 await link.click();
 const opener=page.getByRole('button',{name:'Ampliar foto 2 de 3',exact:true}),pages=context.pages().length;
 await opener.click();const modal=page.getByRole('dialog',{name:'Galeria de fotos da oferta'});
 await expect(modal).toBeVisible();await expect(modal.locator('.viewer img')).toHaveAttribute('src','https://images.example.com/2.svg');await expect(modal.locator('.counter')).toHaveText('2 / 3');
 await expect(modal.locator('.viewer img')).toHaveCSS('object-fit','contain');expect(await modal.locator('.viewer').evaluate(el=>{const box=el.getBoundingClientRect(),image=el.querySelector('img')!.getBoundingClientRect();return image.top>=box.top&&image.bottom<=box.bottom+1&&image.left>=box.left&&image.right<=box.right+1;})).toBe(true);
 await modal.getByRole('button',{name:'Próxima foto',exact:true}).click();await expect(modal.locator('.counter')).toHaveText('3 / 3');
 await page.keyboard.press('ArrowRight');await expect(modal.locator('.counter')).toHaveText('1 / 3');
 await page.keyboard.press('ArrowLeft');await expect(modal.locator('.counter')).toHaveText('3 / 3');
 await modal.getByRole('button',{name:'Ver foto 2',exact:true}).click();await expect(modal.locator('.counter')).toHaveText('2 / 3');
 await modal.locator('.viewer').evaluate(el=>{el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[new Touch({identifier:1,target:el,clientX:200,clientY:100})]}));el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:1,target:el,clientX:80,clientY:100})]}));});await expect(modal.locator('.counter')).toHaveText('3 / 3');
 expect(context.pages().length).toBe(pages);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(opener).toBeFocused();
 await opener.click();await modal.getByRole('button',{name:'Fechar galeria'}).click();await expect(modal).not.toBeVisible();
 await opener.click();await expect(modal).toBeVisible();await page.mouse.click(2,2);await expect(modal).not.toBeVisible();
 await opener.click();await expect(modal.getByRole('button',{name:'Foto anterior',exact:true})).toBeVisible();await expect(modal.getByRole('button',{name:'Fechar galeria'})).toBeFocused();await page.keyboard.press('Tab');await expect(modal.getByRole('button',{name:'Foto anterior',exact:true})).toBeFocused();
 await page.screenshot({path:`test-results/gallery-${mobile?'mobile':'desktop'}.png`});
});

test('imagem padrão local cobre cards, miniaturas e modal; próxima foto válida continua funcionando',async({page})=>{
 const productId='11111111-1111-4111-8111-111111111111',offerId='22222222-2222-4222-8222-222222222222';
 const broken='https://images.example.com/broken.jpg',good='https://images.example.com/good.svg',fallback='/images/product-unavailable.svg';
 await page.route(broken,route=>route.abort());
 await page.route(good,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>'}));
 const offer={id:offerId,product_id:productId,title:'Oferta com fotos',marketplace_id:'amazon',marketplace_name:'Amazon',image_url:broken,images:[broken,good],price_cents:10000,status:'published',affiliate_url:'https://www.amazon.com.br/p',description:'',conditions:''};
 const product={id:productId,name:offer.title,category_path:[],category_ids:[],display_image_url:broken,offer_count:1,available:true,min_price_cents:10000,max_price_cents:10000,offers:[offer],page:1,pageSize:24};
 await page.route('**/api/products*',route=>route.fulfill({json:{items:[product],total:1,page:1,pageSize:24}}));
 await page.route('**/api/products/'+productId+'?*',route=>route.fulfill({json:product}));
 await page.route('**/api/offers/'+offerId,route=>route.fulfill({json:offer}));
 await page.goto('/sobre');await page.getByRole('link',{name:'Explorar',exact:true}).click();
 await expect(page.locator('product-card .product-visual img')).toHaveAttribute('src',fallback);
 await page.locator('product-card .card-cta').click();await expect(page.locator('offer-card .product-visual img')).toHaveAttribute('src',fallback);
 await page.locator('offer-card h3 a').click();const thumbnail=page.getByRole('button',{name:'Ampliar foto 1 de 2'});await expect(thumbnail.locator('img')).toHaveAttribute('src',fallback);await thumbnail.click();const modal=page.getByRole('dialog',{name:'Galeria de fotos da oferta'});
 await expect(modal.locator('.viewer img')).toHaveAttribute('src',fallback);await expect.poll(()=>modal.locator('.viewer img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await modal.getByRole('button',{name:'Próxima foto',exact:true}).click();await expect(modal.locator('.viewer img')).toHaveAttribute('src',good);await page.keyboard.press('Escape');
});
