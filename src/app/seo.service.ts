import { CSP_NONCE, Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HOME_DESCRIPTION, HOME_TITLE, SITE_URL, absolute, safeJson, summary } from './seo-data';
interface PageSeo { title: string; description: string; path: string; indexable?: boolean; image?: string | null; schemas?: object[]; }
@Injectable({providedIn:'root'})
export class Seo {
 private readonly document = inject(DOCUMENT);
 private readonly router = inject(Router);
 private readonly meta = inject(Meta);
 private readonly title = inject(Title);
 private readonly response = inject(RESPONSE_INIT, {optional:true});
 private readonly nonce = inject(CSP_NONCE, {optional:true});
 constructor() {
  this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
   if (event instanceof NavigationStart) this.set({title:HOME_TITLE,description:HOME_DESCRIPTION,path:event.url.split(/[?#]/)[0],indexable:false});
  });
 }
 set(page: PageSeo) {
  this.status(200);
  this.title.setTitle(page.title);
  const description=summary(page.description),url=absolute(page.path);
  this.meta.updateTag({name:'description',content:description});
  this.meta.updateTag({name:'robots',content:page.indexable === false?'noindex,follow':'index,follow'});
  for (const [property,content] of Object.entries({'og:title':page.title,'og:description':description,'og:url':url,'og:type':'website','og:site_name':'O Espertinho'})) this.meta.updateTag({property,content});
  this.meta.updateTag({name:'twitter:card',content:'summary_large_image'});
  const image=page.image?.startsWith('https://')?page.image:SITE_URL+'/brand/espertinho-icon-caramelo-v9-180.png';
  this.meta.updateTag({property:'og:image',content:image});
  this.meta.updateTag({name:'twitter:image',content:image});
  this.document.head.querySelectorAll('link[rel="canonical"]').forEach(node=>node.remove());
  const canonical=this.document.createElement('link');canonical.rel='canonical';canonical.href=url;this.document.head.appendChild(canonical);
  this.document.getElementById('site-structured-data')?.remove();
  if (page.schemas?.length) {
   const script=this.document.createElement('script');script.id='site-structured-data';script.type='application/ld+json';
   if(this.nonce) script.setAttribute('nonce',this.nonce);
   script.textContent=safeJson({'@context':'https://schema.org','@graph':page.schemas});this.document.head.appendChild(script);
  }
 }
 status(status: number) { if(this.response) this.response.status=status; }
 failure(status: number | null = 503) {
  const missing=status===400||status===404;
  this.set({title:(missing?'Página não encontrada':'Página temporariamente indisponível')+' | O Espertinho',description:missing?'A página solicitada não foi encontrada. Explore outros produtos e compare preços no Espertinho.':'Não foi possível carregar esta página. Tente novamente em instantes.',path:this.router.url.split(/[?#]/)[0],indexable:false});
  this.status(missing?404:503);
 }
}
