import {Component,Input,Output,EventEmitter,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';
import {CategoryNode} from '../models';
let nextId=0;
@Component({selector:'offer-category-fields',imports:[FormsModule],template:`
 <div class="form-grid">
 @for(value of levels();track $index;let level=$index){
  <label>{{level===0?'Categoria':level===1?'Subcategoria (opcional)':'Subcategoria nível '+(level+1)+' (opcional)'}}<input [attr.list]="id+'-'+level" [ngModel]="value" (ngModelChange)="change(level,$event)" [ngModelOptions]="{standalone:true}" maxlength="80" [required]="level===0" [disabled]="level>0&&!path[level-1]?.trim()" placeholder="Selecione ou digite uma categoria" autocomplete="off">
  <datalist [id]="id+'-'+level">@for(name of optionsAt(level);track name){<option [value]="name"></option>}</datalist></label>
 }
 </div>
 <p class="legal-small muted">Até 10 níveis. Preencha uma subcategoria para abrir o próximo nível. Ao alterar um nível, seus descendentes são removidos. Novas opções são salvas junto com o produto.</p>
 @if(failed()){<p class="legal-small muted">As sugestões estão indisponíveis. Você ainda pode digitar os níveis.</p>}
`})
export class CategoryFields implements OnInit {
 @Input() path:string[]=[''];@Output() pathChange=new EventEmitter<string[]>();
 api=inject(Api);id='offer-category-'+nextId++;options=signal<CategoryNode[]>([]);failed=signal(false);
 ngOnInit(){void this.api.get<CategoryNode[]>('/admin/category-tree').then(v=>this.options.set(v)).catch(()=>this.failed.set(true));}
 levels(){return Array.from({length:Math.min(10,Math.max(2,this.path.length+(this.path.at(-1)?.trim()?1:0)))},(_,i)=>this.path[i]??'');}
 optionsAt(level:number){const key=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase();return this.options().filter(n=>n.path.length===level+1&&n.path.slice(0,level).every((s,i)=>key(s)===key(this.path[i]??''))).map(n=>n.path[level]);}
 change(level:number,value:string){const path=this.path.slice(0,level);if(value.trim()||!level)path.push(value);this.pathChange.emit(path);}
}
