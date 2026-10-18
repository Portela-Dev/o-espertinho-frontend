import {Component,input,output,computed} from '@angular/core';
@Component({selector:'app-pagination',template:`
<nav class="pagination" [attr.aria-label]="label()">
<button type="button" class="button outline small" [disabled]="busy()||page()<=1" (click)="change.emit(page()-1)">← Anterior</button>
<span role="status">Página {{page()}} de {{pages()}} · {{total()}} registros</span>
<button type="button" class="button outline small" [disabled]="busy()||page()>=pages()" (click)="change.emit(page()+1)">Próxima →</button>
</nav>`})
export class Pagination {
 readonly page=input(1);readonly total=input(0);readonly size=input(20);readonly busy=input(false);readonly label=input('Paginação');readonly change=output<number>();
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.total()/this.size())));
}
