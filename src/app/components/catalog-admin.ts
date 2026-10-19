import {DismissOnBackdrop} from './dismiss-on-backdrop';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {InfiniteScroll} from './infinite-scroll';
import {Component,Input,OnChanges,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {RouterLink,ActivatedRoute} from '@angular/router';
import {Api} from '../api.service';
import {ProductPicker} from './product-picker';
import {MarketplaceLogo} from './marketplace-logo';
import {storeNames} from '../models';
interface Market {id:string;name:string;website_url:string;logo_url:string;allowed_hosts:string[];scraping_enabled:boolean;url_normalization_rules?:{type:string;marker:string}[]}
interface Rule {wholeSelector?:string;fractionSelector?:string;field:string;selectorsText:string;mode:string;attribute:string;required:boolean;nameSelector:string;valueSelector:string}
@Component({selector:'catalog-admin',imports:[DismissOnBackdrop,Pagination,InfiniteScroll,FormsModule,CurrencyPipe,DatePipe,RouterLink,ProductPicker,MarketplaceLogo],templateUrl:'./catalog-admin.html'})
export class CatalogAdmin implements OnChanges {
 @Input() section='marketplaces';api=inject(Api);route=inject(ActivatedRoute);loading=signal(false);busy=signal(false);failed=signal(false);markets=signal<Market[]>([]);linkFeed=new PagedData<any>((page,pageSize)=>this.api.get('/admin/link-imports',{paginate:true,page,pageSize}));links=this.linkFeed.items;marketFeed=new PagedData<Market>(page=>this.api.get('/admin/catalog-marketplaces',{paginate:true,page}));preview=signal<any>(null);marketModal=signal(false);deleting=signal<Market|null>(null);deletingLink=signal<any>(null);
 normalizationMarkers='';normalizationTestUrl='';normalizedPreview=signal('');
 specSize=10;specPage=1;evidenceSize=10;evidencePage=1;productId='';sellerName='';reassignProductId='';selected='amazon';editing=false;marketDraft={id:'',name:'',websiteUrl:'',logoUrl:'',hosts:'',scrapingEnabled:true};rules:Rule[]=[];version=0;waitSeconds=15;validityMinutes=360;linkUrl='';category='';subcategory='';testUrl='';authorized=false;
 editingClassification=signal<any>(null);classificationDraft={category:'',subcategory:''};
 fields=[{id:'title',name:'Nome do produto'},{id:'brand',name:'Marca'},{id:'price',name:'Preço da oferta'},{id:'originalPrice',name:'Preço de referência'},{id:'images',name:'Imagens'},{id:'description',name:'Descrição'},{id:'specifications',name:'Características'},{id:'conditions',name:'Condições da oferta'},{id:'category',name:'Categoria'},{id:'externalId',name:'Identificador do produto'},{id:'productUrl',name:'URL do produto'}];
 ngOnChanges(){void this.load();}
 async load(){
  this.productId=this.route.snapshot.queryParamMap.get('product')||this.productId;
  this.selected=this.route.snapshot.queryParamMap.get('marketplace')||this.selected;
  this.loading.set(true);this.failed.set(false);
  try{
   if(this.section==='marketplaces'){await this.marketFeed.reset();return;}
   const markets=await this.api.get<Market[]>('/admin/catalog-marketplaces');this.markets.set(markets);
   for(const market of markets){storeNames[market.id]=market.name;}
   if(!markets.some(market=>market.id===this.selected)){this.selected=markets[0]?.id||'';}
   if(this.section==='selectors'&&this.selected){await this.loadProfile();}
   if(this.section==='links'){await this.linkFeed.reset();}
  }catch(error){this.api.fail(error);this.failed.set(true);}
  finally{this.loading.set(false);}
 }

 async act(work:()=>Promise<void>,message:string){if(this.busy())return;this.busy.set(true);try{await work();this.api.success(message);}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 clearPreview(){this.specPage=1;this.evidencePage=1;this.preview.set(null);this.authorized=false;}
 async selectMarket(){this.clearPreview();if(this.section==='selectors')await this.act(()=>this.loadProfile(),'Seletores carregados.');}
 async loadProfile(){const p=await this.api.get<any>('/admin/selectors/'+this.selected);this.version=p.version;this.waitSeconds=p.wait_timeout_ms/1000;this.validityMinutes=p.validity_minutes;this.rules=p.rules.map((r:any)=>({...r,selectorsText:r.selectors.join('\n'),attribute:r.attribute||'',nameSelector:r.nameSelector||'th',valueSelector:r.valueSelector||'td'}));if(!this.rules.length)this.rules=[this.newRule('title'),this.newRule('price')];}
 newRule(field='title'):Rule{return {field,selectorsText:'',mode:'text',attribute:'',required:field==='title'||field==='price',nameSelector:'th',valueSelector:'td'};}
 addRule(){this.rules.push(this.newRule('images'));this.clearPreview();}
 moveRule(index:number,offset:number){const target=index+offset;if(target<0||target>=this.rules.length)return;[this.rules[index],this.rules[target]]=[this.rules[target],this.rules[index]];this.clearPreview();}
 profileBody(){return {version:this.version,waitTimeoutMs:Math.round(this.waitSeconds*1000),validityMinutes:this.validityMinutes,rules:this.rules.map(({selectorsText,...r})=>({...r,wholeSelector:r.mode==='text'&&['price','originalPrice'].includes(r.field)?r.wholeSelector||undefined:undefined,fractionSelector:r.mode==='text'&&['price','originalPrice'].includes(r.field)?r.fractionSelector||undefined:undefined,selectors:selectorsText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}))};}
 async saveProfile(){await this.act(async()=>{const r=await this.api.send<{version:number}>('PUT','/admin/selectors/'+this.selected,this.profileBody());this.version=r.version;this.clearPreview();},'Seletores salvos. As próximas extrações usarão essas regras.');}
 async testProfile(){this.clearPreview();await this.act(async()=>{this.preview.set(await this.api.send('POST','/admin/selectors/'+this.selected+'/test',{url:this.testUrl,profile:this.profileBody()}));},'Teste concluído. Nenhuma oferta foi cadastrada.');}
 openMarket(m?:Market){this.normalizationMarkers=(m?.url_normalization_rules||[]).map(r=>r.marker).join('\n');this.normalizationTestUrl='';this.normalizedPreview.set('');this.editing=!!m;this.marketDraft=m?{id:m.id,name:m.name,websiteUrl:m.website_url,logoUrl:m.logo_url||'',hosts:m.allowed_hosts.join('\n'),scrapingEnabled:m.scraping_enabled}:{id:'',name:'',websiteUrl:'',logoUrl:'',hosts:'',scrapingEnabled:true};this.marketModal.set(true);}
 async saveMarket(){await this.act(async()=>{const d=this.marketDraft;await this.api.send(this.editing?'PUT':'POST','/admin/catalog-marketplaces'+(this.editing?'/'+d.id:''),{id:d.id,name:d.name,websiteUrl:d.websiteUrl,logoUrl:d.logoUrl,allowedHosts:d.hosts.split(/[\n,]/).map(s=>s.trim().toLowerCase()).filter(Boolean),scrapingEnabled:d.scrapingEnabled,urlNormalizationRules:this.normalizationRules()});this.marketModal.set(false);await this.load();},'Marketplace salvo. Configure seus seletores na aba Seletores.');}
 normalizationRules(){return this.normalizationMarkers.split(/\r?\n/).map(marker=>marker.trim()).filter(Boolean).map(marker=>({type:'remove_path_suffix',marker}));}
 async testNormalization(){this.normalizedPreview.set('');await this.act(async()=>{const result=await this.api.send<{url:string}>('POST','/admin/catalog-marketplaces/normalize-url',{url:this.normalizationTestUrl,allowedHosts:this.marketDraft.hosts.split(/[\n,]/).map(h=>h.trim().toLowerCase()).filter(Boolean),rules:this.normalizationRules()});this.normalizedPreview.set(result.url);},'Normalização calculada. Nenhuma página foi acessada.');}
 async deleteMarket(){const m=this.deleting();if(!m)return;await this.act(async()=>{await this.api.send('DELETE','/admin/catalog-marketplaces/'+m.id);this.deleting.set(null);await this.load();},'Marketplace excluído.');}
 openClassification(link:any){this.reassignProductId=link.product_id;this.editingClassification.set(link);}
 async saveClassification(){const link=this.editingClassification();if(!link){return;}await this.act(async()=>{await this.api.send('PUT','/admin/offers/'+link.id+'/product',{productId:this.reassignProductId,expectedUpdatedAt:link.updated_at});this.editingClassification.set(null);await this.linkFeed.go(this.linkFeed.page()||1);},'Produto vinculado. A oferta voltou para revisão.');}
 async deleteLink(){const link=this.deletingLink();if(!link){return;}await this.act(async()=>{await this.api.send('DELETE','/admin/offers/'+link.id,{expectedUpdatedAt:link.updated_at});this.deletingLink.set(null);await this.linkFeed.go(this.linkFeed.page()||1);},'Oferta excluída.');}
 async extractLink(){this.clearPreview();await this.act(async()=>{this.preview.set(await this.api.send('POST','/admin/link-imports/preview',{marketplaceId:this.selected,productId:this.productId,sellerName:this.sellerName,url:this.linkUrl}));},'Prévia gerada. Confira os dados antes de cadastrar.');}
 async confirmLink(){const preview=this.preview();if(!preview?.canConfirm||!this.authorized){return;}await this.act(async()=>{await this.api.send('POST','/admin/link-imports/confirm',{previewId:preview.previewId,authorizedContent:true});this.clearPreview();this.linkUrl='';await this.linkFeed.go(this.linkFeed.page()||1);},'Oferta cadastrada como pendente. Publique pela revisão de ofertas.');}
 fieldLabel(field:string){return this.fields.find(f=>f.id===field)?.name||field;}
}
