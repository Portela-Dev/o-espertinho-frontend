import {test,expect} from './coverage';

for(const mode of [{name:'desktop',width:1320,theme:'light'},{name:'mobile',width:375,theme:'light'},{name:'dark',width:1320,theme:'dark'}]){
 test(`avaliações em cards de produto e oferta — ${mode.name}`,async({page})=>{
  await page.setViewportSize({width:mode.width,height:950});
  const id='11111111-1111-4111-8111-111111111111';
  const offer={id:'22222222-2222-4222-8222-222222222222',product_id:id,title:'Celular avaliado',marketplace_id:'amazon',marketplace_name:'Amazon',price_cents:89990,rating:4.8,review_count:3102,status:'published',availability_status:'available',affiliate_url:'https://www.amazon.com.br/p',data_updated_at:new Date().toISOString()};
  const product={id,name:offer.title,category_path:['Tecnologia'],category_ids:[],available:true,offer_count:1,min_price_cents:89990,max_price_cents:89990,rating:4.8,review_count:3102,rating_marketplace_name:'Amazon',offers:[offer]};
  await page.route('**/api/products*',route=>route.fulfill({json:{items:[product,{...product,id:'33333333-3333-4333-8333-333333333333',name:'Produto sem avaliações',rating:null,review_count:null}],total:2,page:1,pageSize:24}}));
  await page.route('**/api/products/'+id+'?*',route=>route.fulfill({json:{...product,page:1,pageSize:24}}));
  // Enter through another route so SSR transfer cache cannot replace this fixture.
  await page.goto('/sobre');await page.evaluate(theme=>document.documentElement.dataset['theme']=theme,mode.theme);
  await page.getByRole('link',{name:'O Espertinho início',exact:true}).click();
  const rated=page.locator('product-card').filter({hasText:'Celular avaliado'});
  await expect(rated.locator('review-rating')).toContainText('3.102 avaliações');
  await expect(rated.locator('.score')).toContainText('4,8');
  await expect(rated.locator('.stars-filled')).toHaveAttribute('style',/96%/);
  await expect(page.locator('product-card').filter({hasText:'Produto sem avaliações'}).locator('.rating')).toHaveCount(0);
  await rated.locator('.card-cta').click();
  await expect(page.locator('offer-card review-rating')).toContainText('3.102 avaliações');
  await expect(page.locator('offer-card review-rating [role=img]')).toHaveAttribute('aria-label',/3102 avaliações/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
