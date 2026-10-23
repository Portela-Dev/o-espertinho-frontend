import {ProductImage} from './product-image';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
import {ReviewRating} from './review-rating';
import {PriceHistoryChart} from './price-history-chart';
import {Component,input,inject,signal} from '@angular/core';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {RouterLink,Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {MarketplaceLogo} from './marketplace-logo';
import {Api} from '../api.service';
import {Offer,Collection,storeNames} from '../models';
@Component({selector:'offer-card',imports:[ProductImage,ReviewRating,DismissOnBackdrop,PriceHistoryChart,CurrencyPipe,DatePipe,RouterLink,FormsModule,MarketplaceLogo],template:`
<article class="offer-card" [class.unavailable]="!available()">@if(history.isLowest(offer().price_cents,available()&&!!offer().affiliate_url)){<span class="low-price-ribbon" title="Menor preço registrado para este produto entre as ofertas monitoradas nos últimos 90 dias. Considera o histórico disponível.">Menor preço registrado!</span>}
  <div class="product-visual"><a [routerLink]="['/oferta',offer().id]" tabindex="-1" aria-hidden="true"><img [productImage]="offer().image_url" alt="" loading="lazy" referrerpolicy="no-referrer"></a>
  @if(discount()>0&&!history.isLowest(offer().price_cents,available()&&!!offer().affiliate_url)){<span class="discount">−{{discount()}}%</span>}
  <button type="button" class="favorite-button" [class.saved]="api.favorites().has(offer().id)" [attr.aria-label]="api.favorites().has(offer().id)?'Remover dos favoritos':'Favoritar oferta'" [attr.aria-pressed]="api.favorites().has(offer().id)" (click)="favorite()">{{api.favorites().has(offer().id)?'♥':'♡'}}</button></div>
  <div class="card-body"><div class="card-store"><marketplace-logo [url]="offer().marketplace_logo_url||''" [name]="offer().marketplace_name||names[offer().marketplace_id]||offer().marketplace_id"/>{{offer().marketplace_name||names[offer().marketplace_id]||offer().marketplace_id}}</div>
  @if(offer().seller_name){<p class="legal-small muted">Vendedor: {{offer().seller_name}}</p>}
  <h3><a [routerLink]="['/oferta',offer().id]">{{offer().title}}</a></h3>
  <review-rating [rating]="offer().rating" [count]="offer().review_count"/><div class="price-block">@if(offer().original_price_cents && offer().original_price_cents!>offer().price_cents){<s>{{offer().original_price_cents!/100|currency:'BRL'}}</s>}<strong>{{offer().price_cents/100|currency:'BRL'}}</strong></div>
  <price-history-chart #history [entityId]="offer().id" kind="offer" [label]="offer().title"/>@if(available()&&offer().affiliate_url){<a class="button dark card-cta" [href]="offer().affiliate_url" target="_blank" rel="sponsored noopener" (click)="track()"><marketplace-logo [url]="offer().marketplace_logo_url||''" [name]="offer().marketplace_name||names[offer().marketplace_id]||offer().marketplace_id"/>Ver na {{offer().marketplace_name||names[offer().marketplace_id]||offer().marketplace_id}} <span>↗</span></a>}@else{<span class="button disabled card-cta">{{offer().availability_status==='unavailable'?'Oferta indisponível':'Oferta encerrada'}}</span>}
  <div class="card-bottom"><small>@if(offer().refresh_status==='pending'){Atualização pendente}@else{Atualizado {{(offer().data_updated_at||offer().verified_at)|date:'dd/MM HH:mm'}}}</small><button type="button" class="text-button" (click)="openCatalog()" aria-label="Adicionar ao catálogo">＋ Catálogo</button></div>
  </div>
</article>
@if(catalogOpen()) {<div class="modal-backdrop" (dismissOnBackdrop)="!saving() && catalogOpen.set(false)"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="catalog-title"><button class="close-button" type="button" (click)="catalogOpen.set(false)" aria-label="Fechar">×</button><p class="eyebrow">GUARDE SEU ACHADO</p><h2 id="catalog-title">Adicionar a um catálogo</h2>@if(catalogs().length){<label>Escolha o catálogo<select [(ngModel)]="selected"><option value="">Selecione</option>@for(c of catalogs();track c.id){<option [value]="c.id">{{c.name}}</option>}</select></label><button class="button dark" [disabled]="!selected||saving()" (click)="add()">{{saving()?'Salvando…':'Adicionar oferta'}}</button>}@else{<p>Crie seu primeiro catálogo para organizar suas ofertas.</p><a routerLink="/catalogos" class="button dark" (click)="catalogOpen.set(false)">Criar catálogo ↗</a>}</section></div>}
`})
export class OfferCard {
  offer=input.required<Offer>();placement=input('home');api=inject(Api);router=inject(Router);names=storeNames;catalogOpen=signal(false);catalogs=signal<Collection[]>([]);selected='';saving=signal(false);
  available(){return this.offer().status==='published'&&this.offer().availability_status!=='unavailable';}
  discount(){const o=this.offer();return o.original_price_cents&&o.original_price_cents>o.price_cents?Math.round((1-o.price_cents/o.original_price_cents)*100):0;}
  async favorite(){if(!this.api.user()){await this.router.navigate(['/entrar'],{queryParams:{next:this.router.url}});return;}try{await this.api.toggleFavorite(this.offer().id);}catch(e){this.api.fail(e);}}
  track(){void this.api.send('POST',`/offers/${this.offer().id}/click`,{placement:this.placement()}).catch(()=>{});}
  async openCatalog(){if(!this.api.user()){await this.router.navigate(['/entrar'],{queryParams:{next:this.router.url}});return;}try{this.catalogs.set(await this.api.get<Collection[]>('/me/collections'));this.catalogOpen.set(true);}catch(e){this.api.fail(e);}}
  async add(){this.saving.set(true);try{await this.api.send('PUT',`/me/collections/${this.selected}/items/${this.offer().id}`);this.catalogOpen.set(false);this.api.success('Oferta adicionada ao catálogo.');}catch(e){this.api.fail(e);}finally{this.saving.set(false);}}
}
