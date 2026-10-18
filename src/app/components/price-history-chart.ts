import {Pagination} from './pagination';
import {Component,input,inject,signal,effect,ViewChild,ElementRef} from '@angular/core';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';
import {PriceHistoryService,ChartHistory} from '../price-history.service';
import {PriceHistoryPlot} from './price-history-plot';
@Component({selector:'price-history-chart',imports:[Pagination,FormsModule,CurrencyPipe,DatePipe,PriceHistoryPlot],styles:`
:host{display:block;min-width:0;margin:.5rem 0}.heading{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:.72rem;color:var(--muted);margin-bottom:.5rem}.expand{border:0;background:none;color:var(--ink);padding:.25rem;text-decoration:underline;cursor:pointer;font:inherit}.note{font-size:.7rem;color:var(--muted);margin:.4rem 0}.status{font-size:.8rem;color:var(--muted);min-height:64px;display:grid;place-content:center}.history-dialog{border:1px solid var(--line);border-radius:18px;padding:1.5rem;width:min(760px,calc(100vw - 2rem));max-width:calc(100vw - 2rem);max-height:90dvh;overflow:auto;background:var(--surface);color:var(--ink);box-sizing:border-box}.history-dialog::backdrop{background:rgba(0,0,0,.6)}.dialog-heading{display:flex;justify-content:space-between;align-items:start;gap:1rem}.dialog-heading h2{font-size:1.3rem;overflow-wrap:anywhere;margin:0 0 .5rem}.close{font-size:1.5rem;background:none;border:0;color:inherit;cursor:pointer;padding:0 .3rem}.controls{display:flex;flex-wrap:wrap;gap:.75rem;margin:.5rem 0}.controls label{flex:1;min-width:130px;margin:0;font-size:.85rem}.controls input,.controls select{width:100%;box-sizing:border-box}.details-plot{max-width:650px;margin:auto}.history-table{overflow:auto;max-height:280px;margin-top:.75rem}.history-table table{width:100%}summary{cursor:pointer;font-size:.9rem;margin-top:1rem}.error{color:var(--red);font-size:.8rem}@media(max-width:480px){.history-dialog{padding:1rem}.dialog-heading h2{font-size:1.1rem}}
`,template:`
<div class="heading"><span>Histórico · 90 dias</span><button type="button" class="expand" [attr.aria-label]="'Ampliar histórico de preços de '+label()" (click)="open()">Ampliar ↗</button></div>
@if(compactLoading()){<div class="status" role="status">Carregando histórico…</div>}@else if(compactFailed()){<div class="status">Histórico indisponível. <button type="button" class="expand" (click)="retry()">Tentar novamente</button></div>}@else{<price-history-plot [compact]="true" [points]="compact()?.series?.points||[]"/>}
<p class="note">A cada 10 dias{{kind()==='product'?' · menor preço':''}}.</p>
<dialog #historyDialog class="history-dialog" [attr.aria-label]="'Histórico de preços: '+label()" (close)="expanded.set(false)">
 @if(expanded()){
 <div class="dialog-heading"><div><h2>Histórico de preços</h2><p class="muted">{{label()}}</p></div><button type="button" class="close" aria-label="Fechar histórico" (click)="close()">×</button></div>
 <div class="controls"><label>Período do histórico<select [ngModel]="period" (ngModelChange)="changePeriod($event)"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="180">Últimos 180 dias</option><option value="365">Último ano</option><option value="custom">Personalizado</option></select></label>
 @if(period==='custom'){<label>Data inicial<input type="date" [(ngModel)]="from" [min]="earliest()" [max]="today()"></label><label>Data final<input type="date" [(ngModel)]="to" [min]="from" [max]="today()"></label><button type="button" class="button outline small" (click)="loadDetail()" [disabled]="detailLoading()||!from||!to">Aplicar período</button>}
 </div>
 @if(detailLoading()){<p role="status">Carregando histórico…</p>}@else if(detailError()){<p class="error" role="alert">{{detailError()}}</p>}@else if(detail();as history){
 <p class="note">{{history.startDate|date:'dd/MM/yyyy'}} a {{history.endDate|date:'dd/MM/yyyy'}} · {{history.intervalDays===1?'Pontos diários':'Pontos a cada '+history.intervalDays+' dias'}} · Horário de Brasília</p>
 <div class="details-plot"><price-history-plot [points]="history.series.points"/></div>
 <p class="note">{{kind()==='product'?'Em cada dia, consideramos o menor preço observado entre os links vinculados ao produto.':'Preços observados neste link.'}} Cada ponto mostra o último dia registrado no intervalo. Lacunas indicam falta de observação ou indisponibilidade; não são preenchidas com preços presumidos. Passe sobre um ponto ou use Tab para consultar seu valor.</p>
 <details><summary>Ver registros diários ({{history.series.daily?.length||0}})</summary><div class="history-table"><table><thead><tr><th>Dia</th><th>Preço registrado</th></tr></thead><tbody>@for(day of (history.series.daily||[]).slice((dailyPage-1)*15,dailyPage*15);track day.date){<tr><td>{{day.date|date:'dd/MM/yyyy'}}</td><td>{{day.priceCents===null?'Indisponível':(day.priceCents/100|currency:'BRL')}}</td></tr>}</tbody></table></div><app-pagination [page]="dailyPage" [total]="history.series.daily?.length||0" [size]="15" (pageChange)="dailyPage=$event" label="Registros diários de preços"/></details>
 }
 <p class="note">Preços observados podem variar por vendedor e condições da loja. O preço final é confirmado no marketplace.</p>
 }
</dialog>
`})
export class PriceHistoryChart {
 entityId=input.required<string>();kind=input<'product'|'offer'>('offer');label=input('');
 @ViewChild('historyDialog') dialog!:ElementRef<HTMLDialogElement>;
 private api=inject(Api);private history=inject(PriceHistoryService);private compactSeq=0;private detailSeq=0;
 compact=signal<ChartHistory|null>(null);compactLoading=signal(true);compactFailed=signal(false);expanded=signal(false);detail=signal<ChartHistory|null>(null);detailLoading=signal(false);detailError=signal('');
 period='90';from='';to='';
 constructor(){effect(()=>{const id=this.entityId(),kind=this.kind();if(this.api.browser)void this.loadCompact(kind,id);});}
 private async loadCompact(kind:'product'|'offer',id:string){const seq=++this.compactSeq;this.compactLoading.set(true);this.compactFailed.set(false);try{const r=await this.history.compact(kind,id);if(seq===this.compactSeq)this.compact.set(r);}catch{if(seq===this.compactSeq)this.compactFailed.set(true);}finally{if(seq===this.compactSeq)this.compactLoading.set(false);}}
 isLowest(current:number|null,eligible=true){const h=this.compact();return eligible&&(this.kind()!=='offer'||h?.series.isCheapestOffer===true)&&!this.compactLoading()&&!this.compactFailed()&&h?.series.id===this.entityId()&&h.series.productLowestPriceCents90d!=null&&current!=null&&current>0&&current<=h.series.productLowestPriceCents90d;}
 retry(){void this.loadCompact(this.kind(),this.entityId());}
 today(){return this.compact()?.endDate??new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 earliest(){return new Date(Date.parse(this.today()+'T00:00:00Z')-364*86400000).toISOString().slice(0,10);}
 open(){this.period='90';this.to=this.today();this.from=this.compact()?.startDate??this.to;this.expanded.set(true);this.dialog.nativeElement.showModal();void this.loadDetail();}
 close(){this.detailSeq++;this.dialog.nativeElement.close();this.expanded.set(false);}
 changePeriod(value:string){this.period=value;if(value!=='custom')void this.loadDetail();}
 dailyPage=1;
 async loadDetail(){this.dailyPage=1;const seq=++this.detailSeq;this.detailLoading.set(true);this.detailError.set('');try{const r=await this.history.detail(this.kind(),this.entityId(),this.period==='custom'?{from:this.from,to:this.to}:{days:Number(this.period)});if(seq===this.detailSeq){this.detail.set(r);this.from=r.startDate;this.to=r.endDate;}}catch(e:any){if(seq===this.detailSeq)this.detailError.set(e?.error?.error??'Não foi possível carregar o histórico. Tente novamente.');}finally{if(seq===this.detailSeq)this.detailLoading.set(false);}}
}
