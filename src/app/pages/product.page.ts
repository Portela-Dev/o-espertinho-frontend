import {ExpandableDescription} from '../components/expandable-description';
import {OfferPhotoGallery} from '../components/offer-photo-gallery';
import {ReviewRating} from '../components/review-rating';
import {formatOfferConditions} from '../offer-conditions';
import {ProductImage} from '../components/product-image';
import {PagedData} from '../paged-data';
import {InfiniteScroll} from '../components/infinite-scroll';
import {CategoryBreadcrumb} from '../components/category-breadcrumb';
import {Component,computed,inject,signal,OnInit,DestroyRef} from '@angular/core';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {Title,Meta} from '@angular/platform-browser';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Api} from '../api.service';
import {Product,Offer,storeNames} from '../models';
import {OfferCard} from '../components/offer-card';
@Component({imports:[ExpandableDescription,ProductImage,OfferPhotoGallery,ReviewRating,InfiniteScroll,CategoryBreadcrumb,RouterLink,CurrencyPipe,DatePipe,OfferCard],styles:'.preview-main-image{position:relative;align-self:start;width:100%;height:auto;aspect-ratio:1;border-radius:12px;overflow:hidden;padding:0}.preview-main-image img{position:absolute;inset:0;display:block;width:100%;height:100%;padding:0;object-fit:contain}.primary-offer{align-items:start}.offer-purchase{display:flex;flex-direction:column;align-items:start;gap:12px;margin:20px 0 24px}.offer-purchase .detail-price{margin:0}.offer-conditions{white-space:pre-wrap;overflow-wrap:anywhere}.other-offers{margin-top:30px}',templateUrl:'./product.page.html'})
export class ProductPage implements OnInit{
 api=inject(Api);route=inject(ActivatedRoute);destroy=inject(DestroyRef);title=inject(Title);meta=inject(Meta);product=signal<Product|null>(null);productId='';feed=new PagedData<Offer>(async page=>{const p=await this.api.get<Product&{page:number;pageSize:number}>('/products/'+this.productId,{paginate:true,page});return {...p,items:p.offers??[],total:p.offer_count};},result=>{this.product.set(result as unknown as Product);});loading=signal(true);failed=signal(false);sequence=0;
 primary=computed(()=>this.feed.items()[0]??null);
 otherOffers=computed(()=>this.feed.items().slice(1));
 names=storeNames;
 conditions(o:Offer){return formatOfferConditions(o.conditions||'',o.price_cents,o.original_price_cents??null);}
 track(o:Offer){void this.api.send('POST','/offers/'+o.id+'/click',{placement:'detail'}).catch(()=>{});}
 ngOnInit(){this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(p=>void this.load(p.get('id')!));}
 async load(id:string){const seq=++this.sequence;this.loading.set(true);this.failed.set(false);try{this.productId=id;await this.feed.reset();if(this.feed.failed()){throw new Error('Product load failed');}const p=this.product()!;if(seq!==this.sequence){return;}this.product.set(p);const main=this.primary();this.title.setTitle((main?.title||p.name)+' | O Espertinho');this.meta.updateTag({name:'description',content:main?.description||main?.title||p.description||p.name});}catch(e:any){if(seq!==this.sequence){return;}this.product.set(null);this.failed.set(e?.status!==404);this.title.setTitle('Produto indisponível | O Espertinho');}finally{if(seq===this.sequence)this.loading.set(false);}}
}
