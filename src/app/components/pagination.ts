import {FormsModule} from '@angular/forms';
import {Component,input,output,computed} from '@angular/core';
@Component({selector:'app-pagination',imports:[FormsModule],template:`
<nav class="pagination" [attr.aria-label]="label()">
<button type="button" class="button outline small" [disabled]="busy()||page()<=1" (click)="pageChange.emit(page()-1)">← Anterior</button>
<label class="page-size">Itens por página<select [ngModel]="size()" [ngModelOptions]="{standalone:true}" [disabled]="busy()" (ngModelChange)="selectSize($event)">@for(value of sizes;track value){<option [value]="value">{{value}}</option>}</select></label>
<span role="status">Página {{page()}} de {{pages()}} · {{total()}} registros</span>
<button type="button" class="button outline small" [disabled]="busy()||page()>=pages()" (click)="pageChange.emit(page()+1)">Próxima →</button>
</nav>`})
export class Pagination {
 readonly page=input(1);readonly total=input(0);readonly size=input(20);readonly busy=input(false);readonly label=input('Paginação');readonly pageChange=output<number>();readonly sizeChange=output<number>();
 readonly sizes=[5,10,15,20,25,50];
 selectSize(selected:number|string){const value=Number(selected);if(this.sizes.includes(value)){this.sizeChange.emit(value);}}
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.total()/this.size())));
}
