import type { Express } from 'express';
import { SITE_URL } from './app/seo-data.ts';
interface Entry { type: 'product' | 'category'; id: string; updated_at: string; }
interface SitemapPage { items: Entry[]; totalPages: number; }
export function xmlEscape(value: string): string { return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;'); }
export function sitemapEntry(entry: Entry): string {
 if (!/^[a-f0-9-]{36}$/i.test(entry.id) || !['product','category'].includes(entry.type)) throw new Error('Invalid sitemap entry');
 const path=entry.type==='product'?'/produto/'+entry.id:'/?categoryId='+entry.id;
 const date=new Date(entry.updated_at);
 return '<url><loc>'+xmlEscape(SITE_URL+path)+'</loc>'+(Number.isNaN(date.getTime())?'':'<lastmod>'+date.toISOString()+'</lastmod>')+'</url>';
}
const declaration='<?xml version="1.0" encoding="UTF-8"?>';
const namespace='http://www.sitemaps.org/schemas/sitemap/0.9'; // NOSONAR -- Required XML namespace identifier, never fetched. See https://www.sitemaps.org/protocol.html
export function registerSitemaps(app: Express, api: string) {
 // A bounded cache collapses concurrent crawler requests without serving failures as XML.
 const cache=new Map<number,{until:number;promise:Promise<SitemapPage>}>();
 function load(page: number): Promise<SitemapPage> {
  const hit=cache.get(page);if(hit && hit.until>Date.now()) return hit.promise;
  const promise=fetch(api+'/api/seo/sitemap?page='+page,{signal:AbortSignal.timeout(8000)}).then(async response=>{
   if(!response.ok) throw new Error('Sitemap API unavailable');
   const data=await response.json() as SitemapPage;
   if(!Array.isArray(data.items)||data.items.length>1000||!Number.isInteger(data.totalPages)||data.totalPages<0||data.totalPages>10000) throw new Error('Invalid sitemap response');
   return data;
  });
  if(cache.size>=100) cache.clear();
  cache.set(page,{until:Date.now()+300000,promise});
  void promise.catch(()=>cache.delete(page));return promise;
 }
 app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: '+SITE_URL+'/sitemap.xml\n'));
 app.get('/sitemap.xml',async(_req,res)=>{
  try {
   const data=await load(1);
   const paths=['/sitemaps/pages.xml',...Array.from({length:data.totalPages},(_,i)=>'/sitemaps/catalog-'+(i+1)+'.xml')];
   res.type('application/xml').set('Cache-Control','public, max-age=300').send(declaration+'<sitemapindex xmlns="'+namespace+'">'+paths.map(path=>'<sitemap><loc>'+SITE_URL+path+'</loc></sitemap>').join('')+'</sitemapindex>');
  } catch { res.status(503).set('Retry-After','60').type('text/plain').send('Sitemap temporariamente indisponível.'); }
 });
 app.get('/sitemaps/pages.xml',(_req,res)=>res.type('application/xml').send(declaration+'<urlset xmlns="'+namespace+'">'+['/','/sobre','/privacidade','/termos'].map(path=>'<url><loc>'+SITE_URL+path+'</loc></url>').join('')+'</urlset>'));
 app.get('/sitemaps/catalog-:page.xml',async(req,res)=>{
  const page=Number(req.params['page']);
  if(!Number.isInteger(page)||page<1||page>10000){res.status(404).end();return;}
  try {
   const data=await load(page);
   if(page>data.totalPages){res.status(404).end();return;}
   res.type('application/xml').set('Cache-Control','public, max-age=300').send(declaration+'<urlset xmlns="'+namespace+'">'+data.items.map(sitemapEntry).join('')+'</urlset>');
  } catch { res.status(503).set('Retry-After','60').type('text/plain').send('Sitemap temporariamente indisponível.'); }
 });
}
