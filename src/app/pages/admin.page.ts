import {DiscoveryAdmin} from '../components/discovery-admin';
import {PagedData} from '../paged-data';
import {Pagination} from '../components/pagination';
import {InfiniteScroll} from '../components/infinite-scroll';
import {Component,inject,signal,OnInit,DestroyRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe,CurrencyPipe} from '@angular/common';
import {RouterLink,RouterLinkActive,ActivatedRoute} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {OfferRefreshAdmin} from '../components/offer-refresh-admin';
import {UsersAdmin} from '../components/users-admin';
import {ProductsAdmin} from '../components/products-admin';
import {ProductPicker} from '../components/product-picker';
import {CatalogAdmin} from '../components/catalog-admin';
import {Api} from '../api.service';
import {Offer,storeNames} from '../models';
@Component({imports:[DiscoveryAdmin,Pagination,InfiniteScroll,UsersAdmin,OfferRefreshAdmin,ProductsAdmin,ProductPicker,CatalogAdmin,FormsModule,RouterLink,RouterLinkActive,DatePipe,CurrencyPipe],templateUrl:'./admin.page.html'})
export class AdminPage implements OnInit {
  api=inject(Api);route=inject(ActivatedRoute);destroy=inject(DestroyRef);title=inject(Title);section=signal('overview');loading=signal(false);failed=signal(false);busy=signal(false);names=storeNames;
  stats=signal<any>(null);offerFeed=new PagedData<Offer>(page=>this.api.get('/admin/offers',{paginate:true,status:this.reviewStatus,page}));offers=this.offerFeed.items;rules=signal<any[]>([]);runs=signal<any[]>([]);logFeed=new PagedData<any>((page,pageSize)=>this.api.get('/admin/audit',{paginate:true,page,pageSize}));logs=this.logFeed.items;
  topSize=5;topPage=1;metricSize=5;metricPage=1;days=30;reviewStatus='pending';offerPage=1;
  ruleModal=signal(false);rule={marketplaceId:'amazon',name:'',keywords:'',category:'Tecnologia',maxReais:null as number|null,minDiscount:0,intervalMinutes:360,enabled:true};
  manualModal=signal(false);editModal=signal(false);editing:Offer|null=null;confirmAction=signal<{message:string;successMessage?:string;action:()=>Promise<void>}|null>(null);
  manual={marketplaceId:'mercadolivre',externalId:'',title:'',description:'',category:'Tecnologia',subcategory:'',imageUrl:'',productUrl:'',affiliateUrl:'',price:0,originalPrice:null as number|null,conditions:'',expiresAt:'',authorizedContent:false,featured:false};
  editDraft={title:'',description:'',category:'',subcategory:'',conditions:'',featured:false,price:0,originalPrice:null as number|null,expiresAt:''};asin='';importProductId='';manualProductId='';asinCategory='Tecnologia';meli={itemId:'',affiliateUrl:'',category:'Outros',authorizedContent:false};
  heading(){return ({discovery:'Exploração de marketplaces',users:'Usuários',profiles:'Perfis de acesso',updates:'Atualização de ofertas',products:'Produtos',overview:'Visão geral',marketplaces:'Marketplaces',selectors:'Seletores',links:'Cadastro de links',offers:'Revisão de ofertas',rules:'Buscas automáticas',activity:'Atividade'} as Record<string,string>)[this.section()]||'Administração';}
  ngOnInit(){const outcome=this.route.snapshot.queryParamMap.get('meli_oauth');if(outcome&&this.api.browser){history.replaceState(null,'',location.pathname);if(outcome==='success')this.api.success('Conta do Mercado Livre conectada. Os tokens serão renovados automaticamente.');else{const messages:Record<string,string>={denied:'Autorização cancelada. Você pode conectar novamente.',invalid:'A conexão expirou ou pertence a outra sessão. Inicie novamente.'};this.api.fail(new Error(messages[outcome]??'Não foi possível conectar. Confira as credenciais, a URI de retorno e as opções OAuth no DevCenter.'));}}this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(p=>{const s=p.get('section')||'overview';this.topPage=1;this.metricPage=1;this.section.set(['discovery','users','profiles','updates','products','overview','marketplaces','offers','rules','activity','selectors','links'].includes(s)?s:'overview');this.title.setTitle(this.heading()+' | Admin | O Espertinho');void this.load();});}
  async load(){this.loading.set(true);this.failed.set(false);try{switch(this.section()){
    case'overview':{const stats:any=await this.api.get('/admin/stats',{days:this.days,paginate:true,topPage:this.topPage,pageSize:this.topSize});this.stats.set(stats);this.topPage=stats.topPage;break;}
    case'offers':await this.offerFeed.reset();if(this.offerFeed.failed())throw new Error('Não foi possível carregar as ofertas.');break;
    case'rules':{const [rules,runs]=await Promise.all([this.api.get<any[]>('/admin/rules'),this.api.get<any[]>('/admin/runs')]);this.rules.set(rules);this.runs.set(runs);break;}
    case'activity':await this.logFeed.reset();break;
  }}catch(e){this.failed.set(true);this.api.fail(e);}finally{this.loading.set(false);}}
  async act(fn:()=>Promise<unknown>,message:string,reload=true){if(this.busy())return;this.busy.set(true);try{await fn();this.api.success(message);if(reload)await this.load();}catch(e){this.api.fail(e);if(reload)await this.load();}finally{this.busy.set(false);}}
  openRule(){this.rule={marketplaceId:'amazon',name:'',keywords:'',category:'Tecnologia',maxReais:null,minDiscount:0,intervalMinutes:360,enabled:true};this.ruleModal.set(true);}
  async saveRule(){await this.act(async()=>{await this.api.send('POST','/admin/rules',{marketplaceId:this.rule.marketplaceId,name:this.rule.name,keywords:this.rule.keywords,category:this.rule.category,maxPriceCents:this.rule.maxReais?Math.round(this.rule.maxReais*100):null,minDiscount:this.rule.minDiscount,intervalMinutes:this.rule.intervalMinutes,enabled:this.rule.enabled});this.ruleModal.set(false);},'Busca criada. Os resultados entrarão na fila de revisão.');}
  runRule(r:any){void this.act(()=>this.api.send('POST',`/admin/rules/${r.id}/run`,{}),'Busca concluída. Confira a fila de revisão.');}
  toggleRule(r:any){void this.act(()=>this.api.send('PATCH','/admin/rules/'+r.id,{enabled:!r.enabled}),r.enabled?'Busca pausada.':'Busca ativada.');}
  deleteRule(r:any){this.confirmAction.set({message:'Excluir a busca “'+r.name+'”?',action:async()=>{await this.api.send('DELETE','/admin/rules/'+r.id);}});}
  async confirm(){const c=this.confirmAction();if(!c)return;this.confirmAction.set(null);await this.act(c.action,c.successMessage||'Ação concluída.');}
  review(o:Offer,action:string){if(action==='publish'){this.confirmAction.set({message:'Publicar “'+o.title+'”? Os dados de ofertas da API serão revalidados antes da publicação.',action:async()=>{await this.api.send('POST',`/admin/offers/${o.id}/review`,{action,expectedUpdatedAt:o.updated_at});}});}else void this.act(()=>this.api.send('POST',`/admin/offers/${o.id}/review`,{action}),'Revisão salva.');}
  deleteOffer(o:Offer){this.confirmAction.set({message:'Excluir definitivamente “'+o.title+'”? A oferta, seus favoritos, itens de catálogos e histórico de cliques serão removidos. Essa ação não pode ser desfeita.',successMessage:'Oferta excluída.',action:async()=>{await this.api.send('DELETE','/admin/offers/'+o.id,{expectedUpdatedAt:o.updated_at});}});}
  refresh(o:Offer){void this.act(()=>this.api.send('POST',`/admin/offers/${o.id}/refresh`,{}),'Dados atualizados. Revise as condições antes de publicar.');}
  editOffer(o:Offer){this.editing=o;const expires=new Date(o.expires_at)>new Date()?new Date(o.expires_at):new Date(Date.now()+86400000);this.editDraft={title:o.title,description:o.description,category:o.category,subcategory:o.subcategory||'',conditions:o.conditions,featured:o.featured,price:o.price_cents/100,originalPrice:o.original_price_cents?o.original_price_cents/100:null,expiresAt:new Date(expires.getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)};this.editModal.set(true);}
  saveEdit(){void this.act(async()=>{const {price,originalPrice,expiresAt,...editorial}=this.editDraft;await this.api.send('PATCH','/admin/offers/'+this.editing!.id,{...editorial,...(this.editing!.source!=='api'?{priceCents:Math.round(price*100),originalPriceCents:originalPrice?Math.round(originalPrice*100):null,expiresAt:new Date(expiresAt).toISOString()}:{})});this.editModal.set(false);},'Alterações salvas. A oferta voltou para revisão.');}
  openManual(){this.manualProductId='';this.manual={marketplaceId:'mercadolivre',externalId:'',title:'',description:'',category:'Tecnologia',subcategory:'',imageUrl:'',productUrl:'',affiliateUrl:'',price:0,originalPrice:null,conditions:'',expiresAt:new Date(Date.now()+24*3600000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),authorizedContent:false,featured:false};this.manualModal.set(true);}
  saveManual(){void this.act(async()=>{await this.api.send('POST','/admin/offers',{productId:this.manualProductId,marketplaceId:this.manual.marketplaceId,externalId:this.manual.externalId,title:this.manual.title,description:this.manual.description,category:this.manual.category,subcategory:this.manual.subcategory,imageUrl:this.manual.imageUrl||null,productUrl:this.manual.productUrl,affiliateUrl:this.manual.affiliateUrl,priceCents:Math.round(this.manual.price*100),originalPriceCents:this.manual.originalPrice?Math.round(this.manual.originalPrice*100):null,conditions:this.manual.conditions,expiresAt:new Date(this.manual.expiresAt).toISOString(),authorizedContent:this.manual.authorizedContent,featured:this.manual.featured});this.manualModal.set(false);},'Oferta cadastrada para revisão.');}
  importAsin(){void this.act(async()=>{await this.api.send('POST','/admin/amazon/import',{productId:this.importProductId,asin:this.asin.trim().toUpperCase(),category:this.asinCategory});this.asin='';},'Produto importado para revisão.');}
  importMeli(){void this.act(async()=>{await this.api.send('POST','/admin/mercadolivre/import',{productId:this.importProductId,...this.meli,itemId:this.meli.itemId.trim().toUpperCase()});this.meli.itemId='';this.meli.affiliateUrl='';this.meli.authorizedContent=false;},'Dados do item importados. Revise o produto e o link de afiliado antes de publicar.');}
  count(status:string){return this.stats()?.offers?.find((o:any)=>o.status===status)?.count||0;}
  maxClicks(){return Math.max(1,...(this.stats()?.marketplaces||[]).map((m:any)=>m.clicks));}
  statusLabel(status:string){return ({pending:'Pendente',published:'Publicada',rejected:'Rejeitada',expired:'Encerrada',connected:'Conectado',catalog_only:'Somente API geral',unverified:'Não validado',not_configured:'Não configurado',error:'Verifique a conexão',running:'Executando',success:'Concluída',failed:'Falhou'} as Record<string,string>)[status]||status;}
}
