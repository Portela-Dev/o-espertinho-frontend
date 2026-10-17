import {Component,Input,Output,EventEmitter,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {Api} from '../api.service';
@Component({selector:'product-picker',imports:[FormsModule,RouterLink],styles:':host{display:block;min-width:0}',template:`
<label>Buscar produto cadastrado<input type="search" [(ngModel)]="query" [ngModelOptions]="{standalone:true}" placeholder="Nome ou SKU" maxlength="160"></label>
<label>Produto<select [ngModel]="value" (ngModelChange)="valueChange.emit($event)" [ngModelOptions]="{standalone:true}" required><option value="">Selecione um produto</option>@for(p of filtered();track p.id){<option [value]="p.id">{{p.sku}} · {{p.name}}</option>}</select></label>
@if(failed()){<p class="inline-error">Não foi possível carregar os produtos.</p><button type="button" class="text-button" (click)="load()">Tentar novamente</button>}
<p class="legal-small muted">O vínculo é definido por você. <a routerLink="/admin/products" class="text-link">Cadastrar ou editar produtos ↗</a></p>`})
export class ProductPicker implements OnInit{
 @Input() value='';@Output() valueChange=new EventEmitter<string>();api=inject(Api);products=signal<any[]>([]);failed=signal(false);query='';
 ngOnInit(){void this.load();}async load(){this.failed.set(false);try{this.products.set(await this.api.get<any[]>('/admin/products'));}catch(e){this.failed.set(true);this.api.fail(e);}}
 filtered(){const q=this.query.toLocaleLowerCase();return this.products().filter(p=>p.id===this.value||(p.name+' '+p.sku).toLocaleLowerCase().includes(q));}
}
