import {FormsModule} from '@angular/forms';
import {Component,input,output,computed} from '@angular/core';
@Component({selector:'app-pagination',imports:[FormsModule],styles:`
:host{display:block;min-width:0}
.pagination-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px 24px;margin:24px 0}
.page-size{display:flex;flex-direction:row;align-items:center;gap:8px;flex:0 0 auto;margin:0;font-size:12px;white-space:nowrap}
.page-size select{width:auto;min-width:72px;margin:0;padding:8px 28px 8px 10px}
.pagination-controls{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;flex:0 1 400px;min-width:min(100%,320px);margin-left:auto}
.pagination-summary{text-align:center;font-size:12px;line-height:1.5}
.pagination-controls button{white-space:nowrap}
.pagination-controls button:disabled{cursor:default}
@media(max-width:640px){.pagination-controls{flex-basis:100%;margin-left:0;gap:8px}}
`,template:`
<nav class="pagination-bar" [attr.aria-label]="label()">
<label class="page-size">Itens por página<select [ngModel]="size()" [ngModelOptions]="{standalone:true}" [disabled]="busy()" (ngModelChange)="selectSize($event)">@for(value of sizes;track value){<option [value]="value">{{value}}</option>}</select></label>
<div class="pagination-controls">
<button type="button" class="button outline small" [disabled]="busy()||page()<=1" (click)="pageChange.emit(page()-1)">← Anterior</button>
<span class="pagination-summary" role="status">Página {{page()}} de {{pages()}} · {{total()}} registros</span>
<button type="button" class="button outline small" [disabled]="busy()||page()>=pages()" (click)="pageChange.emit(page()+1)">Próxima →</button>
</div>
</nav>`})
export class Pagination {
 readonly page=input(1);readonly total=input(0);readonly size=input(20);readonly busy=input(false);readonly label=input('Paginação');readonly pageChange=output<number>();readonly sizeChange=output<number>();
 readonly sizes=[5,10,15,20,25,50];
 selectSize(selected:number|string){const value=Number(selected);if(this.sizes.includes(value)){this.sizeChange.emit(value);}}
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.total()/this.size())));
}
