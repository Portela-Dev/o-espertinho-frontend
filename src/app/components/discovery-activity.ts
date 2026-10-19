import {Component,OnInit,OnDestroy,inject,input,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {Api} from '../api.service';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
interface Run {id:string;source_name:string;marketplace_name:string;status:string;pages:number;found:number;added:number;duplicates:number;invalid:number;created_at:string;heartbeat_at:string|null;stop_reason:string|null;error:string|null;current_url:string|null}
@Component({selector:'discovery-activity',imports:[FormsModule,DatePipe,Pagination,DismissOnBackdrop],templateUrl:'./discovery-activity.html',styles:`:host{display:block}.activity-tools{display:flex;align-items:end;gap:16px;flex-wrap:wrap;margin:20px 0}.activity-tools label{min-width:150px;margin:0}.activity-tools select{margin:0}.url{display:block;overflow-wrap:anywhere;max-width:420px}.actions{display:flex;gap:12px;flex-wrap:wrap}td{vertical-align:top}.detail{width:min(800px,100%);color:var(--ink);border:0;margin:0}.detail p{overflow-wrap:anywhere}`})
export class DiscoveryActivity implements OnInit,OnDestroy {
 api=inject(Api);markets=input<{id:string;name:string}[]>([]);view=signal<'runs'|'links'>('runs');marketplaceId='';status='pending';runId='';busy=signal(false);cancelTarget=signal<Run|null>(null);archiveTarget=signal<any|null>(null);selected=signal<Run|null>(null);private timer?:ReturnType<typeof setInterval>;private polling=false;
 runs=new PagedData<Run>((page,pageSize)=>this.api.get('/admin/discovery/runs',{page,pageSize,marketplaceId:this.marketplaceId}));
 links=new PagedData<any>((page,pageSize)=>this.api.get('/admin/discovery/links',{page,pageSize,marketplaceId:this.marketplaceId,status:this.status,runId:this.runId}));
 events=new PagedData<any>((page,pageSize)=>this.api.get('/admin/discovery/runs/'+this.selected()!.id+'/events',{page,pageSize}));
 async ngOnInit(){await this.runs.reset();if(this.api.browser)this.timer=setInterval(()=>{void this.poll();},3000);}
 ngOnDestroy(){clearInterval(this.timer);}
 label(status:string){return ({queued:'Aguardando worker',running:'Em execução',completed:'Concluída',failed:'Interrompida',cancelled:'Cancelada',pending:'Pendente',archived:'Arquivado'} as Record<string,string>)[status]||status;}
 reason(value:string|null){if(!value)return '';return ({limit:'Limite configurado atingido',duration_limit:'Duração máxima atingida',end:'Fim da navegação',single_page:'Página única',no_progress:'Sem novos resultados',repeated_page:'Página repetida',blocked:'Bloqueio ou CAPTCHA',timeout:'Tempo de espera excedido',navigation:'Falha de navegação',pagination:'Falha na paginação',emptyPage:'Página sem itens',invalidItem:'Card sem link válido',worker_lost:'Worker interrompido ou sem comunicação',worker_stopped:'Worker encerrado',technical_failure:'Falha técnica',cancelled:'Cancelamento solicitado'} as Record<string,string>)[value]||value;}
 active(run:Run){return ['queued','running'].includes(run.status);}
 async switchView(view:'runs'|'links'){this.view.set(view);await (view==='runs'?this.runs:this.links).reset();}
 async filter(){this.runId='';await (this.view()==='runs'?this.runs:this.links).reset();}
 async showLinks(run?:Run){this.runId=run?.id||'';this.selected.set(null);this.view.set('links');await this.links.reset();}
 async details(run:Run){this.selected.set(run);await this.events.reset();}
 async poll(){
  if(this.polling||this.runs.loading())return;this.polling=true;
  try{
   const page=this.runs.page()||1,market=this.marketplaceId;
   const data=await this.api.get<any>('/admin/discovery/runs',{page,pageSize:this.runs.pageSize(),marketplaceId:market});
   if(page===this.runs.page()&&market===this.marketplaceId&&!this.runs.loading()){this.runs.items.set(data.items);this.runs.total.set(data.total);}
   const selected=this.selected();if(selected&&this.active(selected)){const latest=await this.api.get<Run>('/admin/discovery/runs/'+selected.id);if(this.selected()?.id===latest.id){this.selected.set(latest);if(!this.events.loading())await this.events.go(this.events.page()||1);}}
  }catch{/* Keep the latest visible progress; explicit reload exposes request failures. */}finally{this.polling=false;}
 }
 async cancel(){const run=this.cancelTarget();if(!run||this.busy())return;this.busy.set(true);try{await this.api.send('POST','/admin/discovery/runs/'+run.id+'/cancel',{});this.cancelTarget.set(null);this.api.success('Exploração cancelada. Links já coletados foram preservados.');await this.runs.go(this.runs.page()||1);if(this.selected()?.id===run.id)this.selected.set(await this.api.get('/admin/discovery/runs/'+run.id));}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 async archive(){const link=this.archiveTarget();if(!link||this.busy())return;this.busy.set(true);try{await this.api.send('POST','/admin/discovery/links/'+link.id+'/archive',{});this.archiveTarget.set(null);this.api.success('Link arquivado; novas descobertas não o reativarão.');await this.links.go(this.links.page()||1);}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
}
