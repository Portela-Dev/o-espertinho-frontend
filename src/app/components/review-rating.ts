import {Component,input} from '@angular/core';
import {DecimalPipe} from '@angular/common';

@Component({selector:'review-rating',imports:[DecimalPipe],styles:`
:host{display:block}.rating{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px;font-size:11px;line-height:1.5;color:var(--muted)}
.stars{position:relative;display:inline-block;white-space:nowrap;letter-spacing:1px;font-size:14px;line-height:1;color:var(--line)}
.stars-filled{position:absolute;inset:0 auto 0 0;overflow:hidden;color:#b56c0b}.score{font-weight:700;color:var(--ink)}
:host-context([data-theme=dark]) .stars-filled{color:#f2ba54}
`,template:`@if(valid()){
 <div class="rating" role="img" [attr.aria-label]="label()" [title]="source()?'Avaliação da oferta com mais avaliações · '+source():label()">
  <span class="stars" aria-hidden="true">★★★★★<span class="stars-filled" [style.width.%]="rating()!*20">★★★★★</span></span>
  <span class="score" aria-hidden="true">{{rating()|number:'1.1-1'}} <span class="rating-scale">/ 5</span></span>
  @if(count()!==null&&count()!==undefined){<span aria-hidden="true">({{count()|number:'1.0-0'}} {{count()===1?'avaliação':'avaliações'}})</span>}
 </div>
}`})
export class ReviewRating {
 rating=input<number|null|undefined>(null);count=input<number|null|undefined>(null);source=input<string|null|undefined>('');
 valid(){const n=this.rating();return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=5;}
 label(){return `Nota ${this.rating()} de 5 estrelas${this.count()!==null&&this.count()!==undefined?', '+this.count()+' avaliações':''}`;}
}
