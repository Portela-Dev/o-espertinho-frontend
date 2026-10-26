import {test,expect} from './coverage';

for(const touch of [false,true]){
 test.describe(touch?'cards em dispositivo de toque':'cards com mouse',()=>{
  test.use({hasTouch:touch,viewport:touch?{width:414,height:896}:{width:1280,height:900}});
  test('hover só eleva os cards quando há mouse com ponteiro preciso',async({page})=>{
   await page.goto('/');
   expect(await page.evaluate(()=>matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(!touch);
   const check=async()=>{
    const card=page.locator('.offer-card').first();await expect(card).toBeVisible();
    const image=card.locator('.product-visual img');await expect(image).toBeVisible();
    const size=await image.boundingBox();
    await card.hover();
    await expect.poll(()=>card.evaluate(e=>getComputedStyle(e).transform)).toBe(touch?'none':'matrix(1, 0, 0, 1, 0, -3)');
    if(touch){
     await image.scrollIntoViewIfNeeded();const position=await image.boundingBox();
     const x=position!.x+position!.width/2,y=Math.max(120,Math.min(650,position!.y+position!.height/2));
     const session=await page.context().newCDPSession(page);
     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     for(const distance of [10,30,80]){
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-distance}]});
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
     }
     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
     await expect.poll(()=>card.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
    }
    const after=await image.boundingBox();expect(after!.width).toBeCloseTo(size!.width,1);expect(after!.height).toBeCloseTo(size!.height,1);
   };
   await check();
   await page.locator('product-card h3 a').first().click();await expect(page.locator('offer-card')).toBeVisible();
   await check();
  });
 });
}
