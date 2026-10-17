import {Component,input,computed,signal} from '@angular/core';
import {CurrencyPipe,DatePipe} from '@angular/common';
import {HistoryPoint} from '../price-history.service';
@Component({selector:'price-history-plot',host:{'[class.compact]':'compact()'},imports:[CurrencyPipe,DatePipe],styles:`
:host{display:block;min-width:0}.plot{width:100%;height:auto;display:block;overflow:visible}.grid{stroke:var(--line);stroke-dasharray:3 4;stroke-width:1}.line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}.dot{fill:var(--accent);stroke:var(--surface);stroke-width:1.5;cursor:crosshair}.dot:focus{outline:none;stroke:var(--ink);stroke-width:3}.dates,.limits{display:flex;justify-content:space-between;gap:.5rem;font-size:.7rem;color:var(--muted)}.readout{font-size:.75rem;min-height:2.5em;margin:.4rem 0 0;color:var(--muted);overflow-wrap:anywhere}.empty{min-height:100px;display:grid;place-content:center;text-align:center;font-size:.8rem;color:var(--muted)}
:host(.compact) .plot{max-height:64px}:host(.compact) .limits,:host(.compact) .readout{display:none}:host(.compact) .empty{min-height:64px;font-size:.72rem}:host(.compact) .dates{font-size:.65rem}
`,template:`
@if(valid().length){
 <div class="limits"><span>{{minimum()/100|currency:'BRL'}}</span><span>{{maximum()/100|currency:'BRL'}}</span></div>
 <svg class="plot" viewBox="0 0 360 120" role="img" aria-label="Gráfico de linhas do histórico de preços; detalhes dos pontos abaixo">
  <title>Histórico de preços em reais</title>
  @for(y of [15,60,105];track y){<line class="grid" x1="10" x2="350" [attr.y1]="y" [attr.y2]="y"/>}
  <path class="line" [attr.d]="line()"/>
  @for(p of points();track p.date;let i=$index){@if(p.priceCents!==null){<circle class="dot" [attr.cx]="x(i)" [attr.cy]="y(p.priceCents)" r="3.5" tabindex="0" [attr.aria-label]="(p.observedDate|date:'dd/MM/yyyy')+': '+(p.priceCents/100|currency:'BRL')" (mouseenter)="active.set(i)" (focus)="active.set(i)"><title>{{p.observedDate|date:'dd/MM/yyyy'}}: {{p.priceCents/100|currency:'BRL'}}</title></circle>}}
 </svg>
 <div class="dates"><span>{{points()[0].date|date:'dd/MM'}}</span><span>{{points()[points().length-1].date|date:'dd/MM'}}</span></div>
 @if(selected();as p){<p class="readout">{{p.observedDate|date:'dd/MM/yyyy'}} · <strong>{{p.priceCents!/100|currency:'BRL'}}</strong></p>}
}@else{<div class="empty">Ainda não há preços registrados neste período.</div>}
`})
export class PriceHistoryPlot {
 compact=input(false);points=input<HistoryPoint[]>([]);active=signal(-1);
 valid=computed(()=>this.points().filter(p=>p.priceCents!==null));
 minimum=computed(()=>Math.min(...this.valid().map(p=>p.priceCents!)));maximum=computed(()=>Math.max(...this.valid().map(p=>p.priceCents!)));
 selected=computed(()=>{const p=this.points()[this.active()];return p?.priceCents!=null?p:this.valid().at(-1);});
 x(i:number){return this.points().length<=1?180:10+i/(this.points().length-1)*340;}
 y(price:number){const min=this.minimum(),max=this.maximum(),pad=Math.max((max-min)*.1,max*.02,1);return 105-(price-min+pad)/(max-min+2*pad)*90;}
 line=computed(()=>{let connected=false;return this.points().map((p,i)=>{if(p.priceCents===null){connected=false;return '';}const command=connected?'L':'M';connected=true;return command+this.x(i).toFixed(2)+' '+this.y(p.priceCents).toFixed(2);}).join(' ');});
}
