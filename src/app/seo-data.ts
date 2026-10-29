import type { Filters, Offer, Product } from './models';
export const SITE_URL = 'https://oespertinho.com.br';
export const HOME_TITLE = 'Compare preços e encontre ofertas | O Espertinho';
export const HOME_DESCRIPTION = 'Compare preços de produtos na Amazon, Mercado Livre e Shopee. Consulte ofertas, condições de compra e o histórico de preços no Espertinho.';
export function summary(text: string, limit = 160): string {
 const clean = text.replace(/<[^<>]*>/g, ' ').replace(/\s+/g, ' ').trim();
 if (clean.length <= limit) return clean;
 const cut = clean.slice(0, limit - 1);
 const end = cut.lastIndexOf(' ');
 return (end > limit / 2 ? cut.slice(0, end) : cut).trim() + '…';
}
export function pageNumber(value: unknown): number {
 const page = Number(value ?? 1);
 return Number.isInteger(page) && page >= 1 && page <= 10000 ? page : 0;
}
export function listingPath(filters: Partial<Filters> = {}, page = 1): string {
 const query = new URLSearchParams();
 if (filters.categoryId) query.set('categoryId', filters.categoryId);
 else if (filters.category) query.set('category', filters.category);
 if (filters.q) query.set('q', filters.q);
 if (filters.marketplace) query.set('marketplace', filters.marketplace);
 if (filters.maxPrice) query.set('maxPrice', String(filters.maxPrice));
 if (filters.sort && filters.sort !== 'recent') query.set('sort', filters.sort);
 if (page > 1) query.set('page', String(page));
 return '/' + (query.size ? '?' + query : '');
}
export function indexableListing(filters: Filters): boolean {
 return !filters.q && !filters.marketplace && !filters.maxPrice && filters.sort === 'recent';
}
export function absolute(path: string): string {
 const local=path.startsWith('/')&&!path.startsWith('//')?path:'/';
 const url=new URL(local,SITE_URL);return url.origin===SITE_URL?url.href:SITE_URL+'/';
}
export function breadcrumbs(names: string[], ids: string[]) {
 return {'@type':'BreadcrumbList', itemListElement: [{'@type':'ListItem',position:1,name:'Início',item:absolute('/')},...names.map((name,index) => ({'@type':'ListItem',position:index+2,name,item:absolute(listingPath({categoryId:ids[index]}))}))]};
}
function imageUrl(value: string | null | undefined): string | undefined {
 if (!value) return undefined;
 try { const url = new URL(value, SITE_URL); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}
export function offerSchema(offer: Offer) {
 return {'@type':'Offer', url:absolute('/oferta/'+offer.id),priceCurrency:'BRL',price:(offer.price_cents/100).toFixed(2),availability:'https://schema.org/'+(offer.availability_status === 'unavailable'?'OutOfStock':'InStock'),...(offer.seller_name?{seller:{'@type':'Organization',name:offer.seller_name}}:{})};
}
export function productSchema(product: Product) {
 const available = product.offer_count > 0 && product.min_price_cents != null && product.max_price_cents != null;
 return {'@type':'Product',name:product.name,description:summary(product.description || product.name, 500),image:imageUrl(product.display_image_url),url:absolute('/produto/'+product.id),...(product.brand?{brand:{'@type':'Brand',name:product.brand}}:{}),...(product.model?{model:product.model}:{}),...(available?{offers:{'@type':'AggregateOffer',priceCurrency:'BRL',lowPrice:(product.min_price_cents!/100).toFixed(2),highPrice:(product.max_price_cents!/100).toFixed(2),offerCount:product.offer_count}}:{})};
}
export function offerProductSchema(offer: Offer) {
 return {'@type':'Product',name:offer.title,description:summary(offer.description||offer.title,500),image:imageUrl(offer.image_url),url:absolute('/oferta/'+offer.id),offers:offerSchema(offer)};
}
export function safeJson(value: unknown): string { return JSON.stringify(value).replaceAll('<', String.raw`\u003c`); }
