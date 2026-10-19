import {Component,OnInit,OnDestroy,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe,CurrencyPipe} from '@angular/common';
import {Api} from '../api.service';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
@Component({selector:'enrichment-admin',imports:[FormsModule,DatePipe,CurrencyPipe,Pagination,DismissOnBackdrop],templateUrl:'./enrichment-admin.html',styles:`:host{display:block}.tools,.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:16px 0}.tools label{margin:0;min-width:160px;flex:1}.tools input,.tools select{margin-bottom:0}td{vertical-align:top}.url{overflow-wrap:anywhere;max-width:320px;display:block}.detail{width:min(800px,100%);margin:0;border:0;color:var(--ink)}.detail img{width:180px;height:180px;object-fit:contain}.detail p{white-space:pre-wrap;overflow-wrap:anywhere}.notice{color:var(--muted);font-size:12px}small{display:block}.actions button[aria-pressed=true]{font-weight:bold}`})
export class EnrichmentAdmin implements OnInit,OnDestroy {
 api=inject(Api);base='/admin/discovery/enrichment';view=signal<'review'|'runs'|'mappings'>('review');markets=signal<any[]>([]);categories=signal<any[]>([]);marketplaceId='';state='';sourceCategory='';retryFailed=false;limit=100;interval=2000;separator='>';busy=signal(false);detail=signal<any>(null);categoryTarget=signal<any>(null);mappingTarget=signal<any>(null);cancelTarget=signal<any>(null);deleteTarget=signal<any>(null);archiveTarget=signal<any>(null);categoryId='';saveMapping=false;private timer?:ReturnType<typeof setInterval>;private polling=false;
 links=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/review',{page,pageSize,marketplaceId:this.marketplaceId,state:this.state,sourceCategory:this.sourceCategory}));
 runs=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/runs',{page,pageSize,marketplaceId:this.marketplaceId}));
 mappings=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/mappings',{page,pageSize,marketplaceId:this.marketplaceId}));
 selectedRun=signal<any>(null);items=new PagedData<any>((page,pageSize)=>this.api.get(this.base+'/runs/'+this.selectedRun().id+'/items',{page,pageSize}));
 async ngOnInit(){try{const [markets,categories]=await Promise.all([this.api.get<any[]>('/admin/catalog-marketplaces'),this.api.get<any[]>(this.base+'/categories')]);this.markets.set(markets);this.categories.set(categories);await this.links.reset();await this.runs.reset();if(this.api.browser)this.timer=setInterval(()=>{void this.poll();},3000);}catch(e){this.api.fail(e);}}
 ngOnDestroy(){clearInterval(this.timer);}
 async selectView(view:'review'|'runs'|'mappings'){this.view.set(view);await this.feed().reset();}
 feed(){return this.view()==='review'?this.links:this.view()==='runs'?this.runs:this.mappings;}
 async filter(){await this.feed().reset();if(this.marketplaceId){try{const v=await this.api.get<any>(this.base+'/settings/'+this.marketplaceId);this.interval=v.request_interval_ms;this.separator=v.category_separator;}catch(e){this.api.fail(e);}}}
 async act(work:()=>Promise<unknown>,message:string){if(this.busy())return;this.busy.set(true);try{await work();this.api.success(message);await this.feed().go(this.feed().page()||1);}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 async start(){await this.act(async()=>{await this.api.send('POST',this.base+'/runs',{marketplaceId:this.marketplaceId,retryFailed:this.retryFailed,limit:this.limit});this.view.set('runs');},'Enriquecimento enfileirado. O worker deve estar ativo.');}
 async saveSettings(){await this.act(()=>this.api.send('PUT',this.base+'/settings/'+this.marketplaceId,{requestIntervalMs:this.interval,categorySeparator:this.separator}),'Configuração salva para as próximas execuções.');}
 active(run:any){return ['queued','running'].includes(run.status);}
 label(status:string){return ({pending:'Pendente',queued:'Aguardando worker',running:'Em execução',completed:'Concluído',failed:'Falha técnica',cancelled:'Cancelado',skipped:'Ignorado'} as Record<string,string>)[status]||status;}
 categoryState(link:any){if(link.confirmed_category_id)return 'Categoria confirmada';if(!link.source_category_path.length)return 'Sem categoria de origem';if(link.suggested_category_id)return 'Categoria sugerida — confirmar';return 'Aguardando categorização';}
 categorize(link:any){this.categoryId=link.confirmed_category_id||link.suggested_category_id||'';this.saveMapping=false;this.categoryTarget.set(link);}
 async confirmCategory(){const link=this.categoryTarget();await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+link.id+'/category',{categoryId:this.categoryId,version:link.enrichment_version,saveMapping:this.saveMapping});this.categoryTarget.set(null);},'Categoria confirmada. Os demais itens continuam aguardando confirmação.');}
 editMapping(row:any){this.mappingTarget.set(row);this.categoryId=row.category_id;}
 async saveEditedMapping(){await this.act(async()=>{await this.api.send('PUT',this.base+'/mappings/'+this.mappingTarget().id,{categoryId:this.categoryId});this.mappingTarget.set(null);},'Mapeamento alterado. Categorias já confirmadas foram preservadas.');}
 async deleteMapping(){await this.act(async()=>{await this.api.send('DELETE',this.base+'/mappings/'+this.deleteTarget().id,{});this.deleteTarget.set(null);},'Mapeamento excluído.');}
 async cancel(){await this.act(async()=>{await this.api.send('POST',this.base+'/runs/'+this.cancelTarget().id+'/cancel',{});this.cancelTarget.set(null);},'Execução cancelada. Dados já extraídos foram preservados.');}
 async archive(){await this.act(async()=>{await this.api.send('POST',this.base+'/review/'+this.archiveTarget().id+'/archive',{});this.archiveTarget.set(null);},'Link arquivado.');}
 async showRun(run:any){this.selectedRun.set(run);await this.items.reset();}
 async poll(){if(this.polling||this.busy())return;this.polling=true;try{const page=this.runs.page()||1;const data=await this.api.get<any>(this.base+'/runs',{page,pageSize:this.runs.pageSize(),marketplaceId:this.marketplaceId});if(!this.runs.loading()&&page===this.runs.page()){this.runs.items.set(data.items);this.runs.total.set(data.total);}if(this.selectedRun()&&!this.items.loading())await this.items.go(this.items.page()||1);}catch{/* Explicit reload reports connection failures. */}finally{this.polling=false;}}
}
