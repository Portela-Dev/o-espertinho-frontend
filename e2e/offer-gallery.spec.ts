import {test,expect} from './coverage';

for(const mobile of [false,true])test(`galeria abre na foto escolhida, navega e fecha sem nova aba — ${mobile?'mobile':'desktop'}`,async({page,context})=>{
 await page.setViewportSize({width:mobile?375:1320,height:900});
 await page.route('https://images.example.com/*',route=>{const portrait=route.request().url().endsWith('2.svg'),w=portrait?200:800,h=portrait?800:200;return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#cef58c"/><rect width="100%" height="20" fill="#173a2b"/><rect y="${h-20}" width="100%" height="20" fill="#b56c0b"/></svg>`});});
 await page.goto('/');await page.locator('product-card .card-cta').first().click();
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
 await opener.click();await page.mouse.click(2,2);await expect(modal).not.toBeVisible();
 await opener.click();await page.keyboard.press('Tab');expect(await modal.evaluate(dialog=>dialog.contains(document.activeElement))).toBe(true);
 await page.screenshot({path:`test-results/gallery-${mobile?'mobile':'desktop'}.png`});
});
