import {test,expect} from './coverage';
const origin='https://oespertinho.com.br';
let products:string[]=[];let total=0;
test.beforeAll(async({request})=>{const response=await request.post('/api/test/seo-fixture');expect(response.ok()).toBe(true);products=(await response.json()).products;total=(await(await request.get('/api/products')).json()).total;});
test.afterAll(async({request})=>{await request.delete('/api/test/seo-fixture');});
function productLinks(html:string){return [...new Set([...html.matchAll(/href="(\/produto\/[a-f0-9-]+)"/g)].map(m=>m[1]))];}
test('SSR exposes distinct paginated products, canonical, heading and crawlable category links',async({request})=>{
 const first=await request.get('/');expect(first.status()).toBe(200);const a=await first.text();
 expect(a).toContain('<h1');expect(a).toContain('Compare preços e encontre ofertas');expect(a).toMatch(/rel="canonical" href="https:\/\/oespertinho.com.br\/"/);expect(a).toMatch(/href="\/\?page=2"/);
 const second=await request.get('/?page=2');expect(second.status()).toBe(200);const b=await second.text();expect(b).toContain(origin+'/?page=2');expect(productLinks(a)).toHaveLength(24);expect(productLinks(b).length).toBeGreaterThan(0);expect(productLinks(a).filter(id=>productLinks(b).includes(id))).toEqual([]);
 const tree=await(await request.get('/api/category-tree')).json(),category=tree.find((c:any)=>c.path[0]==='SEO Teste');
 expect(a).toContain('categoryId='+category.id);const categoryResponse=await request.get('/?categoryId='+category.id);const html=await categoryResponse.text();expect(html).toContain('SEO Teste — compare preços');expect(html).toContain(origin+'/?categoryId='+category.id);expect(html).toContain('BreadcrumbList');
 expect((await request.get('/?page=9999')).status()).toBe(404);expect((await request.get('/?page=bad')).status()).toBe(404);
 expect((await request.get('/?categoryId=00000000-0000-4000-8000-000000000000')).status()).toBe(404);
});
test('infinite scroll still appends products and resets correctly after filtering',async({page})=>{
 await page.goto('/');await expect(page.locator('product-card')).toHaveCount(24);await page.locator('app-infinite-scroll').scrollIntoViewIfNeeded();await expect(page.locator('product-card')).toHaveCount(Math.min(48,total));
 await page.getByRole('link',{name:'SEO Teste',exact:true}).click();await expect(page.locator('h1')).toContainText('SEO Teste');await expect(page.locator('product-card')).toHaveCount(24);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',/categoryId=/);
});
test('product and offer SSR carry unique metadata and safe structured data without imported ratings',async({request})=>{
 const data=await(await request.get('/api/products/'+products[0])).json();const response=await request.get('/produto/'+products[0]);const html=await response.text();expect(response.status()).toBe(200);expect(html).toContain('SEO item 00 — compare preços');expect(html).toContain('AggregateOffer');expect(html).toContain('BRL');expect(html).not.toContain('aggregateRating');expect(html).not.toContain('ESP_');
 expect(html).toContain('offerPage=2');const second=await request.get('/produto/'+products[0]+'?offerPage=2');expect(second.status()).toBe(200);const b=await second.text();expect(b).toContain('offerPage=2');expect(b).toContain('SEO oferta 0');
 const offer=await request.get('/oferta/'+data.offers[0].id);expect(offer.status()).toBe(200);expect(await offer.text()).toContain('"@type":"Offer"');
 const unavailable=await request.get('/produto/'+products[26]);expect(unavailable.status()).toBe(200);const empty=await unavailable.text();expect(empty).toContain('noindex,follow');expect(empty).not.toContain('AggregateOffer');
});
test('missing URLs are real 404s, utility pages noindex and searches do not inherit product metadata',async({request,page})=>{
 for(const path of ['/missing-seo-page','/produto/00000000-0000-4000-8000-000000000000','/oferta/00000000-0000-4000-8000-000000000000','/produto/bad']){
  const r=await request.get(path);expect(r.status(),path).toBe(404);expect(await r.text()).toContain('noindex,follow');
 }
 for(const path of ['/entrar','/admin','/favoritos','/catalogos'])expect((await request.get(path)).headers()['x-robots-tag']).toContain('noindex');
 const search=await request.get('/?q=SEO&utm_source=test');expect(await search.text()).toContain('noindex,follow');
 await page.goto('/produto/'+products[0]);await expect(page.locator('#site-structured-data')).toHaveCount(1);await page.getByRole('link',{name:'O Espertinho início',exact:true}).click();await expect(page).toHaveTitle('Compare preços e encontre ofertas | O Espertinho');await expect(page.locator('#site-structured-data')).not.toContainText('AggregateOffer');await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',origin+'/');
});
test('robots and sitemap serve proper public documents and published products only',async({request})=>{
 const robots=await request.get('/robots.txt');expect(robots.headers()['content-type']).toContain('text/plain');expect(await robots.text()).toContain('Sitemap: '+origin+'/sitemap.xml');
 const index=await request.get('/sitemap.xml');expect(index.status()).toBe(200);expect(index.headers()['content-type']).toContain('application/xml');expect(await index.text()).toContain('<sitemapindex');
 const shard=await request.get('/sitemaps/catalog-1.xml');expect(shard.status()).toBe(200);const xml=await shard.text();expect(xml).toContain('/produto/'+products[0]);expect(xml).toContain('categoryId=');expect(xml).not.toContain('affiliate');expect(xml).not.toContain('pending');
});
