import {ProductImage} from './product-image';
import {ReviewAiSettings} from './review-ai-settings';
import {RouterLink} from '@angular/router';
import {ReviewRating} from './review-rating';
import {ActionMenu} from './action-menu';
import {CategoryFields} from './category-fields';
import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe,CurrencyPipe} from '@angular/common';
import {Api} from '../api.service';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
@Component({selector:'enrichment-admin',imports:[ProductImage,ReviewRating,ReviewAiSettings,RouterLink,ActionMenu,CategoryFields,FormsModule,DatePipe,CurrencyPipe,Pagination,DismissOnBackdrop],templateUrl:'./enrichment-admin.html',styles:`:host{display:block}.tools,.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:16px 0}.tools label{margin:0;min-width:160px;flex:1}.tools input,.tools select{margin-bottom:0}td{vertical-align:top}.url{overflow-wrap:anywhere;max-width:320px;display:block}.detail{width:min(800px,100%);margin:0;border:0;color:var(--ink)}.detail img{width:180px;height:180px;object-fit:contain}.detail p{white-space:pre-wrap;overflow-wrap:anywhere}.notice{color:var(--muted);font-size:12px}small{display:block}.actions button[aria-pressed=true]{font-weight:bold}.category-tree-fields{border:0;padding:0;margin:0;min-width:0}`})
export class EnrichmentAdmin implements OnInit {
 api=inject(Api);base='/admin/discovery/enrichment';view=signal<'review'|'mappings'|'ai'>('review');markets=signal<any[]>([]);categories=signal<any[]>([]);marketplaceId='';state='';sourceCategory='';busy=signal(false);detail=signal<any>(null);categoryTarget=signal<any>(null);mappingTarget=signal<any>(null);deleteTarget=signal<any>(null);archiveTarget=signal<any>(null);categoryId='';saveMapping=false;
 links=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/review',{page,pageSize,marketplaceId:this.marketplaceId,state:this.state,sourceCategory:this.sourceCategory}));
 mappings=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/mappings',{page,pageSize,marketplaceId:this.marketplaceId}));
 async ngOnInit(){try{const [markets,categories]=await Promise.all([this.api.get<any[]>('/admin/catalog-marketplaces'),this.api.get<any[]>(this.base+'/categories')]);this.markets.set(markets);this.categories.set(categories);await this.links.reset();
}catch(e){this.api.fail(e);}}
 creatingCategory=signal(false);newCategoryPath:string[]=[''];
 productTarget=signal<any>(null);productMode:'existing'|'new'='existing';productQuery='';selectedProductId='';
 productDraft={name:'',description:'',brand:'',imageUrl:''};
 products=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/review/'+this.productTarget().id+'/products',{page,pageSize,q:this.productQuery}));
 async assignProduct(link:any){
  if(link.extraction_status!=='completed')return;
  this.productMode='existing';this.productQuery='';this.selectedProductId=link.product_id||'';
  const data=link.enrichment_data||{};
  this.productDraft={name:link.draft_name||data.title||'',description:link.draft_description||data.description||'',brand:link.draft_brand||data.brand||'',imageUrl:(data.images||[]).find((url:string)=>url.startsWith('https://'))||''};
  if(link.ai_product?.action==='link_existing'){this.selectedProductId=link.ai_product.productId;}
  if(link.ai_product?.action==='create_new'){this.productMode='new';this.productDraft={...this.productDraft,...link.ai_product.product};}
  this.productTarget.set(link);await this.products.reset();
 }
 async confirmProduct(){const link=this.productTarget();await this.act(async()=>{
  const body=this.productMode==='existing'?{mode:'existing',version:link.enrichment_version,productId:this.selectedProductId}:{mode:'new',version:link.enrichment_version,product:{...this.productDraft,imageUrl:this.productDraft.imageUrl.trim()||null}};
  await this.api.send('POST',this.base+'/review/'+link.id+'/product',body);this.productTarget.set(null);
 },'Produto atribuído. Revise o anúncio antes de publicar.');}
 selectedLinks=signal<Map<string,{id:string;version:number;title:string}>>(new Map());
 bulkConfirm=signal(false);bulkResults=signal<any[]>([]);
 canPublish(link:any){return link.status!=='archived'&&!link.published_offer_id&&!!link.product_id&&!!link.confirmed_category_id&&!!link.affiliate_url&&link.extraction_status==='completed'&&!!link.enrichment_data?.priceCents&&!link.enrichment_data?.missing?.length;}
 clearSelection(){this.selectedLinks.set(new Map());}
 toggleLink(link:any){if(!this.canPublish(link)||this.busy())return;const next=new Map(this.selectedLinks());if(next.has(link.id))next.delete(link.id);else if(next.size<100)next.set(link.id,{id:link.id,version:link.enrichment_version,title:link.enrichment_data?.title||link.url});this.selectedLinks.set(next);}
 pageSelected(){const ready=this.links.items().filter(link=>this.canPublish(link));return !!ready.length&&ready.every(link=>this.selectedLinks().has(link.id));}
 togglePage(){const ready=this.links.items().filter(link=>this.canPublish(link)),remove=this.pageSelected(),next=new Map(this.selectedLinks());for(const link of ready){if(remove)next.delete(link.id);else if(next.size<100)next.set(link.id,{id:link.id,version:link.enrichment_version,title:link.enrichment_data?.title||link.url});}this.selectedLinks.set(next);}
 async publishSelected(){const selected=[...this.selectedLinks().values()];if(!selected.length)return;await this.act(async()=>{
  const result=await this.api.send<{results:any[];published:number;failed:number}>('POST',this.base+'/review/publish-batch',{items:selected.map(({id,version})=>({id,version})),authorizedContent:true});
  this.bulkResults.set(result.results.map(row=>({...row,title:selected.find(item=>item.id===row.id)?.title})));this.selectedLinks.set(new Map());this.bulkConfirm.set(false);
 },'Publicação em massa concluída. Confira o resultado de cada link.');}
 publishTarget=signal<any>(null);
 async publish(){const link=this.publishTarget();await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+link.id+'/publish',{version:link.enrichment_version,authorizedContent:true});this.publishTarget.set(null);},'Oferta publicada.');}
 async selectView(view:'review'|'mappings'|'ai'){this.selectedLinks.set(new Map());this.bulkResults.set([]);this.view.set(view);if(view!=='ai')await this.feed().reset();}
 feed(){return this.view()==='mappings'?this.mappings:this.links;}
 async filter(){this.selectedLinks.set(new Map());this.bulkResults.set([]);await this.feed().reset();}
 async act(work:()=>Promise<unknown>,message:string){if(this.busy())return;
this.busy.set(true);try{await work();this.api.success(message);await this.feed().go(this.feed().page()||1);}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 label(status:string){return ({pending:'Pendente',queued:'Aguardando extensão',running:'Em execução',completed:'Concluído',failed:'Falha técnica',cancelled:'Cancelado',skipped:'Ignorado'} as Record<string,string>)[status]||status;}
 availabilityLabel(data:any){if(data?.availability==='unavailable')return 'Indisponível';
 return data?.availability==='available'||data?.priceCents>0?'Disponível':'Não confirmada';}
 categoryState(link:any){if(link.product_draft_id&&!link.product_id)return 'Rascunho aguardando categorização';if(link.confirmed_category_id)return 'Categoria confirmada';
if(!link.source_category_path.length)return 'Sem categoria de origem';
if(link.suggested_category_id)return 'Categoria sugerida — confirmar';
return 'Aguardando categorização';}
 categorize(link:any){this.categoryId=link.confirmed_category_id||link.suggested_category_id||'';this.saveMapping=false;this.creatingCategory.set(false);this.newCategoryPath=[''];if(link.ai_category){this.categoryId=link.ai_category.categoryId||'';if(!this.categoryId&&link.ai_category.categoryPath?.length){this.newCategoryPath=[...link.ai_category.categoryPath];this.creatingCategory.set(true);}}
this.categoryTarget.set(link);}
 async createCategory(){
  if(this.busy())return;
this.busy.set(true);
  try{
   const node=await this.api.send<{id:string;path:string[];nodes:{id:string;path:string[]}[]}>('POST',this.base+'/categories',{categoryPath:this.newCategoryPath});
   this.categories.update(current=>[...new Map([...current,...node.nodes].map(value=>[value.id,value])).values()].sort((a,b)=>a.path.join(' › ').localeCompare(b.path.join(' › '))));
   this.categoryId=node.id;this.creatingCategory.set(false);this.newCategoryPath=[''];
   this.api.success('Árvore disponível e selecionada. Confirme a categoria para atribuí-la ao item.');
  }catch(e){this.api.fail(e);}finally{this.busy.set(false);}
 }
 async confirmCategory(){const link=this.categoryTarget();await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+link.id+'/category',{categoryId:this.categoryId,version:link.enrichment_version,saveMapping:this.saveMapping});this.categoryTarget.set(null);},'Categoria do produto atualizada. Os vínculos relacionados foram preservados.');}
 editMapping(row:any){this.mappingTarget.set(row);this.categoryId=row.category_id;}
 async saveEditedMapping(){await this.act(async()=>{await this.api.send('PUT',this.base+'/mappings/'+this.mappingTarget().id,{categoryId:this.categoryId});this.mappingTarget.set(null);},'Mapeamento alterado. Categorias já confirmadas foram preservadas.');}
 async deleteMapping(){await this.act(async()=>{await this.api.send('DELETE',this.base+'/mappings/'+this.deleteTarget().id,{});this.deleteTarget.set(null);},'Mapeamento excluído.');}
 async archive(){await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+this.archiveTarget().id+'/archive',{});this.archiveTarget.set(null);},'Link arquivado.');}
 async discardAi(requestId:string){await this.act(async()=>{await this.api.send('POST',this.base+'/ai/suggestions/'+requestId+'/discard',{});this.categoryTarget.set(null);this.productTarget.set(null);},'Sugestão descartada. O item pode ser analisado novamente pela extensão.');}
 async retryLink(link:any){await this.act(()=>this.api.send('POST',this.base+'/review/'+link.id+'/retry',{}),'Retentativa preparada. Execute o passo 3 na extensão.');}
}
