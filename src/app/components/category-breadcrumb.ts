import {Component,Input} from '@angular/core';
import {RouterLink} from '@angular/router';
@Component({selector:'category-breadcrumb',imports:[RouterLink],styles:`:host{display:block;min-width:0}nav{display:flex;flex-wrap:wrap;gap:.3rem .5rem;align-items:center;font-size:.85rem;line-height:1.6;margin:.5rem 0 1rem}a{overflow-wrap:anywhere;color:inherit;text-decoration:underline;text-underline-offset:3px}span{opacity:.6}`,
 template:`<nav aria-label="Categorias"><a routerLink="/" [queryParams]="base" fragment="ofertas">Todos os achados</a>@for(name of names;track $index;let i=$index){<span aria-hidden="true">›</span><a routerLink="/" [queryParams]="query(i)" fragment="ofertas" [attr.aria-current]="i===names.length-1?'page':null">{{name}}</a>}</nav>`})
export class CategoryBreadcrumb {
 @Input() names:string[]=[];@Input() ids:string[]=[];@Input() base:Record<string,unknown>={};
 query(i:number){return {...this.base,category:'',categoryId:this.ids[i],page:1};}
}
