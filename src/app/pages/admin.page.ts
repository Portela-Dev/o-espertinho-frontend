import {SharingAdmin} from '../components/sharing-admin';
import {CatalogPurge} from '../components/catalog-purge';
import {combineLatest} from 'rxjs';
import {ProductPicker} from '../components/product-picker';
import {ActionMenu} from '../components/action-menu';
import {CatalogOperations} from '../components/catalog-operations';
import {EnrichmentAdmin} from '../components/enrichment-admin';
import {DismissOnBackdrop} from '../components/dismiss-on-backdrop';
import {DiscoveryAdmin} from '../components/discovery-admin';
import {PagedData} from '../paged-data';
import {Pagination} from '../components/pagination';
import {Component,inject,signal,OnInit,DestroyRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe,CurrencyPipe} from '@angular/common';
import {RouterLink,RouterLinkActive,ActivatedRoute} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {UsersAdmin} from '../components/users-admin';
import {ProductsAdmin} from '../components/products-admin';
import {CatalogAdmin} from '../components/catalog-admin';
import {Api} from '../api.service';
import {Offer,storeNames} from '../models';
@Component({imports:[SharingAdmin,CatalogPurge,ActionMenu,CatalogOperations,EnrichmentAdmin,DismissOnBackdrop,DiscoveryAdmin,Pagination,ProductPicker,UsersAdmin,ProductsAdmin,CatalogAdmin,FormsModule,RouterLink,RouterLinkActive,DatePipe,CurrencyPipe],templateUrl:'./admin.page.html'})
export class AdminPage implements OnInit {
  api=inject(Api);route=inject(ActivatedRoute);destroy=inject(DestroyRef);title=inject(Title);section=signal('overview');loading=signal(false);failed=signal(false);busy=signal(false);names=storeNames;
  stats=signal<any>(null);offerFeed=new PagedData<Offer>((page,pageSize)=>this.api.get('/admin/offers',{paginate:true,status:this.reviewStatus,page,pageSize}));offers=this.offerFeed.items;logFeed=new PagedData<any>((page,pageSize)=>this.api.get('/admin/audit',{paginate:true,page,pageSize}));logs=this.logFeed.items;
  topSize=5;topPage=1;metricSize=5;metricPage=1;days=30;reviewStatus='all';manualOpen=signal(false);
  editModal=signal(false);editing:Offer|null=null;confirmAction=signal<{message:string;successMessage?:string;action:()=>Promise<void>}|null>(null);
  editDraft={title:'',description:'',category:'',subcategory:'',conditions:'',featured:false,price:0,originalPrice:null as number|null,expiresAt:''};
  marketTabs=[{id:'marketplaces',path:'/admin/marketplaces',label:'Cadastro'},{id:'discovery',path:'/admin/discovery',label:'Exploração'},{id:'selectors',path:'/admin/selectors',label:'Seletores'}];
  tabs(){return [
   {label:'Visão geral',sections:['overview']},{label:'Revisão',sections:['offers']},{label:'Ofertas',sections:['links','sharing']},{label:'Produtos',sections:['products']},
   {label:'Marketplaces',sections:['marketplaces','discovery','selectors']},{label:'Execuções',sections:['updates']},{label:'Acessos',sections:['users','profiles']},{label:'Manutenção',sections:['purge']},{label:'Atividade',sections:['activity']}
  ].flatMap(tab=>{const first=tab.sections.find(section=>this.api.adminSection(section));return first?[{...tab,path:first==='overview'?'/admin':'/admin/'+first}]:[];});}
  editingClassification=signal<Offer|null>(null);reassignProductId='';
  openClassification(offer:Offer){this.reassignProductId=offer.product_id;this.editingClassification.set(offer);}
  async saveClassification(){const offer=this.editingClassification();if(!offer)return;
   await this.act(async()=>{await this.api.send('PUT','/admin/offers/'+offer.id+'/product',{productId:this.reassignProductId,expectedUpdatedAt:offer.updated_at});this.editingClassification.set(null);},'Produto vinculado. A oferta voltou para revisão.');
  }
  manualCreated(){this.manualOpen.set(false);this.reviewStatus='pending';void this.load();}
  heading(){return ({sharing:'Compartilhamento de ofertas',purge:'Manutenção do catálogo',discovery:'Exploração de marketplaces',users:'Usuários',profiles:'Perfis de acesso',updates:'Execuções',products:'Produtos',overview:'Visão geral',marketplaces:'Marketplaces',selectors:'Seletores',links:'Ofertas',offers:'Revisão de ofertas',activity:'Atividade'} as Record<string,string>)[this.section()]||'Administração';}
  ngOnInit(){combineLatest([this.route.paramMap,this.route.queryParamMap]).pipe(takeUntilDestroyed(this.destroy)).subscribe(([p,query])=>{const s=p.get('section')||'overview';this.topPage=1;this.metricPage=1;const status=query.get('status');if(status&&['all','pending','published','rejected','expired'].includes(status)){this.reviewStatus=status;}this.manualOpen.set(query.has('product')||query.get('new')==='1');this.section.set(['sharing','purge','discovery','users','profiles','updates','products','overview','marketplaces','offers','activity','selectors','links'].includes(s)?s:'overview');this.title.setTitle(this.heading()+' | Admin | O Espertinho');void this.load();});}
  async load(){this.loading.set(true);this.failed.set(false);try{switch(this.section()){
    case'overview':{const stats:any=await this.api.get('/admin/stats',{days:this.days,paginate:true,topPage:this.topPage,pageSize:this.topSize});this.stats.set(stats);this.topPage=stats.topPage;break;}
    case'links':await this.offerFeed.reset();if(this.offerFeed.failed())throw new Error('Não foi possível carregar as ofertas.');break;
    case'activity':await this.logFeed.reset();break;
  }}catch(e){this.failed.set(true);this.api.fail(e);}finally{this.loading.set(false);}}
  async act(fn:()=>Promise<unknown>,message:string,reload=true){if(this.busy())return;this.busy.set(true);try{await fn();this.api.success(message);if(reload)await this.load();}catch(e){this.api.fail(e);if(reload)await this.load();}finally{this.busy.set(false);}}
  async confirm(){const c=this.confirmAction();if(!c)return;this.confirmAction.set(null);await this.act(c.action,c.successMessage||'Ação concluída.');}
  review(o:Offer,action:string){if(action==='publish'){this.confirmAction.set({message:'Publicar “'+o.title+'”? Confira os dados antes de publicar.',action:async()=>{await this.api.send('POST',`/admin/offers/${o.id}/review`,{action,expectedUpdatedAt:o.updated_at});}});}else void this.act(()=>this.api.send('POST',`/admin/offers/${o.id}/review`,{action}),'Revisão salva.');}
  deleteOffer(o:Offer){this.confirmAction.set({message:'Excluir definitivamente “'+o.title+'”? A oferta, seus favoritos, itens de catálogos e histórico de cliques serão removidos. Essa ação não pode ser desfeita.',successMessage:'Oferta excluída.',action:async()=>{await this.api.send('DELETE','/admin/offers/'+o.id,{expectedUpdatedAt:o.updated_at});}});}
  editOffer(o:Offer){this.editing=o;const expires=new Date(o.expires_at)>new Date()?new Date(o.expires_at):new Date(Date.now()+86400000);this.editDraft={title:o.title,description:o.description,category:o.category,subcategory:o.subcategory||'',conditions:o.conditions,featured:o.featured,price:o.price_cents/100,originalPrice:o.original_price_cents?o.original_price_cents/100:null,expiresAt:new Date(expires.getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)};this.editModal.set(true);}
  saveEdit(){void this.act(async()=>{const {price,originalPrice,expiresAt,...editorial}=this.editDraft;await this.api.send('PATCH','/admin/offers/'+this.editing!.id,{...editorial,priceCents:Math.round(price*100),originalPriceCents:originalPrice?Math.round(originalPrice*100):null,expiresAt:new Date(expiresAt).toISOString()});this.editModal.set(false);},'Alterações salvas. A oferta voltou para revisão.');}
  count(status:string){return this.stats()?.offers?.find((o:any)=>o.status===status)?.count||0;}
  maxClicks(){return Math.max(1,...(this.stats()?.marketplaces||[]).map((m:any)=>m.clicks));}
  statusLabel(status:string){return ({pending:'Pendente',published:'Publicada',rejected:'Rejeitada',expired:'Encerrada'} as Record<string,string>)[status]||status;}
}
