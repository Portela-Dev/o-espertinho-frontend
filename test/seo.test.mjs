import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summary,listingPath,pageNumber,indexableListing,absolute,safeJson,productSchema,offerProductSchema,breadcrumbs} from '../src/app/seo-data.ts';
import {xmlEscape,sitemapEntry,registerSitemaps} from '../src/sitemap.ts';
import express from 'express';
import {createServer} from 'node:http';

test('SEO normalizes canonical filters, pages and summaries without HTML',()=>{
 assert.equal(absolute('//attacker.example'),'https://oespertinho.com.br/');assert.equal(absolute('https://attacker.example'),'https://oespertinho.com.br/');assert.equal(absolute('/produto/a'),'https://oespertinho.com.br/produto/a');
 assert.equal(listingPath({q:'',sort:'recent',maxPrice:0},1),'/');
 assert.equal(listingPath({categoryId:'test',q:'a & b',marketplace:'amazon'},2),'/?categoryId=test&q=a+%26+b&marketplace=amazon&page=2');
 assert.equal(listingPath({category:'Áudio',sort:'price_asc',maxPrice:100},3),'/?category=%C3%81udio&maxPrice=100&sort=price_asc&page=3');
 for(const value of ['0','-1','1.5','10001','bad'])assert.equal(pageNumber(value),0);
 assert.equal(pageNumber(null),1);assert.equal(pageNumber('2'),2);
 assert.equal(summary('<b>Nome</b>   seguro'),'Nome seguro');assert.ok(summary('palavra '.repeat(100)).length<=160);
 assert.equal(summary('<'.repeat(50000)+'sem fechamento').length,160);
 assert.equal(summary('<b>Nome</b><i>seguro</i>'),'Nome seguro');
 assert.equal(indexableListing({q:'',marketplace:'',maxPrice:0,sort:'recent'}),true);
 assert.equal(indexableListing({q:'busca',marketplace:'',maxPrice:0,sort:'recent'}),false);
 assert.ok(!safeJson({text:'</script><script>alert(1)</script>'}).includes('<'));
 assert.equal(JSON.parse(safeJson({text:'</script>'})).text,'</script>');
 const trail=breadcrumbs(['Tecnologia'],['test']);assert.equal(trail.itemListElement.length,2);assert.equal(trail.itemListElement[0].item,'https://oespertinho.com.br/');assert.equal(trail.itemListElement[1].position,2);
});
test('product data has real prices only, no internal SKU or imported aggregate ratings',()=>{
 const p={id:'p',name:'Produto',brand:'Marca',model:'Modelo',description:'Descrição',display_image_url:'https://example.com/p.jpg',offer_count:2,min_price_cents:1089,max_price_cents:3159,rating:5,review_count:100,sku:'PRIVATE'};
 const schema=productSchema(p);assert.equal(schema.offers.lowPrice,'10.89');assert.equal(schema.offers.highPrice,'31.59');assert.equal(schema.offers.offerCount,2);assert.equal(schema.sku,undefined);assert.equal(schema.aggregateRating,undefined);
 assert.equal(productSchema({...p,offer_count:0,min_price_cents:null,max_price_cents:null}).offers,undefined);
 const offer=offerProductSchema({id:'o',title:'Oferta',description:'',image_url:'javascript:alert(1)',price_cents:999,availability_status:'unavailable',marketplace_id:'amazon'});
 assert.equal(offer.image,undefined);assert.equal(offer.offers.availability,'https://schema.org/OutOfStock');
});
test('sitemap validates IDs and escapes XML',()=>{
 assert.equal(xmlEscape('<>&\"\''),'&lt;&gt;&amp;&quot;&apos;');
 const entry={type:'category',id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',updated_at:'2026-10-29T12:00:00Z'};
 assert.match(sitemapEntry(entry),/categoryId=aaaaaaaa/);assert.match(sitemapEntry({...entry,type:'product'}),/\/produto\//);
 assert.doesNotMatch(sitemapEntry({...entry,updated_at:'bad'}),/lastmod/);
 assert.throws(()=>sitemapEntry({...entry,id:'<script>'}));assert.throws(()=>sitemapEntry({...entry,type:'account'}));
});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;}
async function stop(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
test('sitemap index and shards use bounded cached API requests, not request Host',async()=>{
 let calls=0;const api=createServer((_req,res)=>{calls++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({totalPages:2,items:[{type:'product',id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',updated_at:'2026-10-29'}]}));});
 const origin=await listen(api),app=express();registerSitemaps(app,origin);const web=createServer(app),base=await listen(web);
 try{
  const index=await fetch(base+'/sitemap.xml',{headers:{Host:'attacker.example'}});assert.match(index.headers.get('content-type'),/xml/);const xml=await index.text();assert.match(xml,/catalog-2.xml/);assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));assert.doesNotMatch(xml,/attacker/);
  const shard=await fetch(base+'/sitemaps/catalog-1.xml');const content=await shard.text();assert.match(content,/produto\/aaaaaaaa/);assert.ok(content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));assert.equal(calls,1);
  assert.equal((await fetch(base+'/sitemaps/catalog-3.xml')).status,404);
  assert.equal((await fetch(base+'/sitemaps/catalog-0.xml')).status,404);
  assert.match(await(await fetch(base+'/robots.txt')).text(),/Sitemap: https:\/\/oespertinho.com.br\/sitemap.xml/);
  assert.match(await(await fetch(base+'/sitemaps/pages.xml')).text(),/\/sobre/);
 }finally{await stop(web);await stop(api);}
});
test('sitemap failures return retryable 503 and are never cached as successful pages',async()=>{
 let fail=true;const api=createServer((_req,res)=>{res.statusCode=fail?503:200;res.end(JSON.stringify({totalPages:0,items:[]}));});
 const origin=await listen(api),app=express();registerSitemaps(app,origin);const web=createServer(app),base=await listen(web);
 try{
  const bad=await fetch(base+'/sitemap.xml');assert.equal(bad.status,503);assert.equal(bad.headers.get('retry-after'),'60');
  assert.equal((await fetch(base+'/sitemaps/catalog-1.xml')).status,503);
  fail=false;const good=await fetch(base+'/sitemap.xml');assert.equal(good.status,200);assert.doesNotMatch(await good.text(),/catalog-1/);
 }finally{await stop(web);await stop(api);}
});
