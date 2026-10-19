import {CategoryFields} from './category-fields';
import {Component,OnInit,OnDestroy,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe,CurrencyPipe} from '@angular/common';
import {Api} from '../api.service';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
@Component({selector:'enrichment-admin',imports:[CategoryFields,FormsModule,DatePipe,CurrencyPipe,Pagination,DismissOnBackdrop],templateUrl:'./enrichment-admin.html',host:{'(window:scroll)':'closeActions()','(window:resize)':'closeActions()'},styles:`:host{display:block}.tools,.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:16px 0}.tools label{margin:0;min-width:160px;flex:1}.tools input,.tools select{margin-bottom:0}td{vertical-align:top}.url{overflow-wrap:anywhere;max-width:320px;display:block}.detail{width:min(800px,100%);margin:0;border:0;color:var(--ink)}.detail img{width:180px;height:180px;object-fit:contain}.detail p{white-space:pre-wrap;overflow-wrap:anywhere}.notice{color:var(--muted);font-size:12px}small{display:block}.actions button[aria-pressed=true]{font-weight:bold}.link-actions{position:fixed;inset:auto;margin:0;width:min(208px,calc(100vw - 16px));max-height:calc(100dvh - 16px);overflow:auto;padding:6px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);box-shadow:0 8px 28px #0003}.link-actions button{display:block;width:100%;min-height:40px;padding:10px 12px;border:0;border-radius:6px;background:transparent;color:var(--ink);text-align:left;font-size:13px}.link-actions button:hover:not(:disabled){background:var(--hover)}.link-actions button:focus-visible{outline-offset:-3px}.link-actions .danger-text{color:var(--red)}.category-tree-fields{border:0;padding:0;margin:0;min-width:0}`})
export class EnrichmentAdmin implements OnInit,OnDestroy {
 api=inject(Api);base='/admin/discovery/enrichment';view=signal<'review'|'runs'|'mappings'>('review');markets=signal<any[]>([]);categories=signal<any[]>([]);marketplaceId='';state='';sourceCategory='';retryFailed=false;limit=100;interval=2000;separator='>';busy=signal(false);detail=signal<any>(null);categoryTarget=signal<any>(null);mappingTarget=signal<any>(null);cancelTarget=signal<any>(null);deleteTarget=signal<any>(null);archiveTarget=signal<any>(null);categoryId='';saveMapping=false;private timer?:ReturnType<typeof setInterval>;private polling=false;
 links=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/review',{page,pageSize,marketplaceId:this.marketplaceId,state:this.state,sourceCategory:this.sourceCategory}));
 runs=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/runs',{page,pageSize,marketplaceId:this.marketplaceId}));
 mappings=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/mappings',{page,pageSize,marketplaceId:this.marketplaceId}));
 selectedRun=signal<any>(null);items=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/runs/'+this.selectedRun().id+'/items',{page,pageSize}));
 async ngOnInit(){try{const [markets,categories]=await Promise.all([this.api.get<any[]>('/admin/catalog-marketplaces'),this.api.get<any[]>(this.base+'/categories')]);this.markets.set(markets);this.categories.set(categories);await this.links.reset();await this.runs.reset();if(this.api.browser)this.timer=setInterval(()=>{void this.poll();},3000);}catch(e){this.api.fail(e);}}
 creatingCategory=signal(false);newCategoryPath:string[]=[''];
 productTarget=signal<any>(null);productMode:'existing'|'new'='existing';productQuery='';selectedProductId='';
 productDraft={name:'',description:'',brand:'',imageUrl:''};
 products=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/review/'+this.productTarget().id+'/products',{page,pageSize,q:this.productQuery}));
 async assignProduct(link:any){
  if(!link.confirmed_category_id||link.extraction_status!=='completed')return;
  this.productMode='existing';this.productQuery='';this.selectedProductId=link.product_id||'';
  const data=link.enrichment_data||{};
  this.productDraft={name:data.title||'',description:data.description||'',brand:data.brand||'',imageUrl:(data.images||[]).find((url:string)=>url.startsWith('https://'))||''};
  this.productTarget.set(link);await this.products.reset();
 }
 async confirmProduct(){const link=this.productTarget();await this.act(async()=>{
  const body=this.productMode==='existing'?{mode:'existing',version:link.enrichment_version,productId:this.selectedProductId}:{mode:'new',version:link.enrichment_version,product:{...this.productDraft,imageUrl:this.productDraft.imageUrl.trim()||null}};
  await this.api.send('POST',this.base+'/review/'+link.id+'/product',body);this.productTarget.set(null);
 },'Produto atribuído. O link aguarda a geração do endereço de afiliado.');}
 private activeActions?:HTMLElement;
 positionActions(event:Event,trigger:HTMLButtonElement,menu:HTMLElement){
  if((event as ToggleEvent).newState!=='open'){if(this.activeActions===menu)this.activeActions=undefined;return;}
  this.activeActions=menu;
  const anchor=trigger.getBoundingClientRect(),bounds=menu.getBoundingClientRect(),gap=8;
  const left=Math.max(gap,Math.min(anchor.right-bounds.width,window.innerWidth-bounds.width-gap));
  const below=anchor.bottom+gap;
  const top=below+bounds.height<=window.innerHeight-gap?below:Math.max(gap,anchor.top-bounds.height-gap);
  menu.style.left=left+'px';menu.style.top=top+'px';
 }
 closeActions(){const menu=this.activeActions;this.activeActions=undefined;if(menu?.isConnected&&menu.matches(':popover-open'))menu.hidePopover();}
 ngOnDestroy(){this.closeActions();clearInterval(this.timer);}
 async selectView(view:'review'|'runs'|'mappings'){this.view.set(view);await this.feed().reset();}
 feed(){return this.view()==='review'?this.links:this.view()==='runs'?this.runs:this.mappings;}
 async filter(){await this.feed().reset();if(this.marketplaceId){try{const v=await this.api.get<any>(this.base+'/settings/'+this.marketplaceId);this.interval=v.request_interval_ms;this.separator=v.category_separator;}catch(e){this.api.fail(e);}}}
 async act(work:()=>Promise<unknown>,message:string){if(this.busy())return;this.busy.set(true);try{await work();this.api.success(message);await this.feed().go(this.feed().page()||1);}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 async start(){await this.act(async()=>{await this.api.send('POST',this.base+'/runs',{marketplaceId:this.marketplaceId,retryFailed:this.retryFailed,limit:this.limit});this.view.set('runs');},'Enriquecimento enfileirado. O worker deve estar ativo.');}
 async saveSettings(){await this.act(()=>this.api.send('PUT',this.base+'/settings/'+this.marketplaceId,{requestIntervalMs:this.interval,categorySeparator:this.separator}),'Configuração salva para as próximas execuções.');}
 active(run:any){return ['queued','running'].includes(run.status);}
 label(status:string){return ({pending:'Pendente',queued:'Aguardando worker',running:'Em execução',completed:'Concluído',failed:'Falha técnica',cancelled:'Cancelado',skipped:'Ignorado'} as Record<string,string>)[status]||status;}
 categoryState(link:any){if(link.confirmed_category_id)return 'Categoria confirmada';if(!link.source_category_path.length)return 'Sem categoria de origem';if(link.suggested_category_id)return 'Categoria sugerida — confirmar';return 'Aguardando categorização';}
 categorize(link:any){this.categoryId=link.confirmed_category_id||link.suggested_category_id||'';this.saveMapping=false;this.creatingCategory.set(false);this.newCategoryPath=[''];this.categoryTarget.set(link);}
 async createCategory(){
  if(this.busy())return;this.busy.set(true);
  try{
   const node=await this.api.send<{id:string;path:string[];nodes:{id:string;path:string[]}[]}>('POST',this.base+'/categories',{categoryPath:this.newCategoryPath});
   this.categories.update(current=>[...new Map([...current,...node.nodes].map(value=>[value.id,value])).values()].sort((a,b)=>a.path.join(' › ').localeCompare(b.path.join(' › '))));
   this.categoryId=node.id;this.creatingCategory.set(false);this.newCategoryPath=[''];
   this.api.success('Árvore disponível e selecionada. Confirme a categoria para atribuí-la ao item.');
  }catch(e){this.api.fail(e);}finally{this.busy.set(false);}
 }
 async confirmCategory(){const link=this.categoryTarget();await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+link.id+'/category',{categoryId:this.categoryId,version:link.enrichment_version,saveMapping:this.saveMapping});this.categoryTarget.set(null);},'Categoria confirmada. Os demais itens continuam aguardando confirmação.');}
 editMapping(row:any){this.mappingTarget.set(row);this.categoryId=row.category_id;}
 async saveEditedMapping(){await this.act(async()=>{await this.api.send('PUT',this.base+'/mappings/'+this.mappingTarget().id,{categoryId:this.categoryId});this.mappingTarget.set(null);},'Mapeamento alterado. Categorias já confirmadas foram preservadas.');}
 async deleteMapping(){await this.act(async()=>{await this.api.send('DELETE',this.base+'/mappings/'+this.deleteTarget().id,{});this.deleteTarget.set(null);},'Mapeamento excluído.');}
 async cancel(){await this.act(async()=>{await this.api.send('POST',this.base+'/runs/'+this.cancelTarget().id+'/cancel',{});this.cancelTarget.set(null);},'Execução cancelada. Dados já extraídos foram preservados.');}
 async archive(){await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+this.archiveTarget().id+'/archive',{});this.archiveTarget.set(null);},'Link arquivado.');}
 async showRun(run:any){this.selectedRun.set(run);await this.items.reset();}
 async poll(){if(this.polling||this.busy())return;this.polling=true;try{const page=this.runs.page()||1;const data=await this.api.get<any>(this.base+'/runs',{page,pageSize:this.runs.pageSize(),marketplaceId:this.marketplaceId});if(!this.runs.loading()&&page===this.runs.page()){this.runs.items.set(data.items);this.runs.total.set(data.total);}if(this.selectedRun()&&!this.items.loading())await this.items.go(this.items.page()||1);}catch{/* Explicit reload reports connection failures. */}finally{this.polling=false;}}
}
