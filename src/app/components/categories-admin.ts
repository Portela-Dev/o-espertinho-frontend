import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';
import {PagedData} from '../paged-data';
import {Pagination} from './pagination';
import {ActionMenu} from './action-menu';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
interface Category {id:string;path:string[];depth:number;product_count?:number;descendant_count?:number}
type Action='rename'|'move'|'merge'|'delete';
interface Preview {revision:string;sourcePath:string[];targetPath:string[]|null;impact:{categories:number;removedCategories:number;products:number;offers:number;reviewLinks:number;mappings:number;savedFilters:number};changes:{from:string[];to:string[]|null;removed:boolean}[]}
@Component({selector:'categories-admin',imports:[FormsModule,Pagination,ActionMenu,DismissOnBackdrop],templateUrl:'./categories-admin.html',styles:`
:host{display:block;min-width:0}.category-path{overflow-wrap:anywhere;max-width:560px}.category-impact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0}.category-impact span{padding:10px;background:var(--surface-inset);border-radius:7px;font-size:12px}.category-confirmation{border-top:1px solid var(--line);margin-top:24px;padding-top:20px}.category-changes{font-size:12px;max-height:180px;overflow:auto;padding-left:20px}.category-changes li{margin-bottom:10px;overflow-wrap:anywhere}.category-path-text{display:block}
@media(max-width:620px){.category-extra{display:none}.category-table-wrap{padding:10px}.category-path-text{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.category-table-wrap th,.category-table-wrap td{padding:10px 7px}.category-table-wrap th{font-size:9px}.category-path{min-width:120px}}
fieldset.category-fields{border:0;padding:0;margin:0;min-width:0}.category-confirmation .button-row{margin-top:18px}.category-current-path{overflow-wrap:anywhere}.modal{width:min(680px,100%)}
`})
export class CategoriesAdmin implements OnInit {
 api=inject(Api);query='';feed=new PagedData<Category>((page,pageSize)=>this.api.get('/admin/categories',{q:this.query,page,pageSize}));
 readonly actions:Action[]=['rename','move','merge','delete'];
 editing=signal<Category|null>(null);action:Action='rename';names:Record<Action,string>={rename:'Renomear',move:'Mover',merge:'Unir',delete:'Excluir'};
 name='';destination='';options=signal<Category[]>([]);busy=signal(false);optionsFailed=signal(false);preview=signal<Preview|null>(null);
 ngOnInit(){void this.feed.reset();}
 destinations(){const source=this.editing();return this.options().filter(n=>!source||!source.path.every((part,i)=>part.toLowerCase()===n.path[i]?.toLowerCase()));}
 async open(category:Category,action:Action){
  this.editing.set(category);this.action=action;this.name=category.path.at(-1)||'';this.destination='';this.preview.set(null);await this.loadOptions();
 }
 async loadOptions(){this.busy.set(true);this.optionsFailed.set(false);try{this.options.set(await this.api.get<Category[]>('/admin/category-tree'));}catch(e){this.optionsFailed.set(true);this.api.fail(e);}finally{this.busy.set(false);}}
 close(){if(!this.busy()){this.editing.set(null);this.preview.set(null);}}
 changed(){this.preview.set(null);}
 operation(){return {action:this.action,sourceId:this.editing()!.id,...(this.action==='rename'?{name:this.name}:this.action==='move'?{parentId:this.destination||null}:{targetId:this.destination||null})};}
 async inspect(){if(this.busy())return;this.busy.set(true);this.preview.set(null);try{this.preview.set(await this.api.send<Preview>('POST','/admin/categories/preview',this.operation()));}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
 async confirm(){const p=this.preview();if(!p||this.busy())return;this.busy.set(true);try{await this.api.send('POST','/admin/categories/apply',{...this.operation(),revision:p.revision,confirm:true});this.editing.set(null);this.preview.set(null);this.api.success('Categorias atualizadas. Produtos e ofertas preservados.');await this.feed.reset();}catch(e){this.preview.set(null);this.api.fail(e);}finally{this.busy.set(false);}}
}
