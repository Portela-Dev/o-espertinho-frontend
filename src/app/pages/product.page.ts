import {Seo} from '../seo.service';
import {breadcrumbs,productSchema,pageNumber} from '../seo-data';
import {combineLatest} from 'rxjs';
import {OfferShare} from '../components/offer-share';
import {MarketplaceLogo} from '../components/marketplace-logo';
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
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Api} from '../api.service';
import {Product,Offer,storeNames} from '../models';
import {OfferCard} from '../components/offer-card';
@Component({imports:[OfferShare,MarketplaceLogo,ExpandableDescription,ProductImage,OfferPhotoGallery,ReviewRating,InfiniteScroll,CategoryBreadcrumb,RouterLink,CurrencyPipe,DatePipe,OfferCard],styles:'.preview-main-image{position:relative;align-self:start;width:100%;height:auto;aspect-ratio:1;border-radius:12px;overflow:hidden;padding:0}.preview-main-image img{position:absolute;inset:0;display:block;width:100%;height:100%;padding:0;object-fit:contain}.primary-offer{align-items:start}.offer-purchase{display:flex;flex-direction:column;align-items:start;gap:12px;margin:20px 0 24px}.offer-purchase .detail-price{margin:0}.offer-conditions{white-space:pre-wrap;overflow-wrap:anywhere}.other-offers{margin-top:30px}',templateUrl:'./product.page.html'})
export class ProductPage implements OnInit{
 router=inject(Router);api=inject(Api);route=inject(ActivatedRoute);destroy=inject(DestroyRef);seo=inject(Seo);primaryOffer=signal<Offer|null>(null);offerPage=1;product=signal<Product|null>(null);productId='';feed=new PagedData<Offer>(async page=>{const p=await this.api.get<Product&{page:number;pageSize:number}>('/products/'+this.productId,{paginate:true,page});return {...p,items:p.offers??[],total:p.offer_count};},result=>{this.product.set(result as unknown as Product);if(result.page===1)this.primaryOffer.set(result.items[0]??null);});loading=signal(true);failed=signal(false);sequence=0;
 primary=computed(()=>this.primaryOffer());
 otherOffers=computed(()=>this.offerPage===1?this.feed.items().slice(1):this.feed.items());
 names=storeNames;
 conditions(o:Offer){return formatOfferConditions(o.conditions||'',o.price_cents,o.original_price_cents??null);}
 track(o:Offer){void this.api.trackAffiliateClick(o.id,'detail').catch(()=>{});}
 ngOnInit(){this.destroy.onDestroy(()=>{this.sequence++;});combineLatest([this.route.paramMap,this.route.queryParamMap]).pipe(takeUntilDestroyed(this.destroy)).subscribe(([params,query])=>void this.load(params.get('id')!,pageNumber(query.get('offerPage'))));}
 offerLink(page:number){return this.router.parseUrl(this.offerPath(page));}
 offerPath(page:number){return '/produto/'+this.productId+(page>1?'?offerPage='+page:'');}
 private async readOffers(page:number,seq:number){
  await this.feed.reset();if(seq!==this.sequence)return false;
  if(!this.feed.failed()&&page>1)await this.feed.reset(page);
  return seq===this.sequence;
 }
 private rejectProduct(status:number|null){this.product.set(null);this.failed.set(status!==404&&status!==400);this.seo.failure(status);}
 private describe(p:Product,page:number){
  const count=p.offer_count;
  const offerLabel=count===1?'oferta':'ofertas';
  const description=count?'Compare '+count+' '+offerLabel+' de '+p.name+'. Confira preços, condições de compra e histórico no Espertinho.':p.name+' está sem ofertas disponíveis no momento. Consulte os detalhes e outras opções no Espertinho.';
  this.seo.set({title:p.name+' — compare preços'+(page>1?' — página '+page:'')+' | O Espertinho',description,path:this.offerPath(page),image:this.primary()?.image_url||p.display_image_url,indexable:count>0,schemas:[productSchema(p),...(p.category_path?.length?[breadcrumbs(p.category_path,p.category_ids||[])]:[])]});
 }
 async load(id:string,page=1){
  const seq=++this.sequence;this.loading.set(true);this.failed.set(false);this.primaryOffer.set(null);this.productId=id;this.offerPage=page;
  try{
   if(!page){this.rejectProduct(404);return;}
   if(!await this.readOffers(page,seq))return;
   if(this.feed.failed()){this.rejectProduct(this.feed.errorStatus());return;}
   if(page>1&&!this.feed.items().length){this.rejectProduct(404);return;}
   const product=this.product()!;this.api.pixel.viewContent('product',product.id);this.describe(product,page);
  }catch{if(seq===this.sequence)this.rejectProduct(503);}
  finally{if(seq===this.sequence)this.loading.set(false);}
 }
}
