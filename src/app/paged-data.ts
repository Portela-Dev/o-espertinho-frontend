import {computed,signal} from '@angular/core';
export interface PageResult<T> {items:T[];total:number;page:number;pageSize:number}
/** A generation prevents stale filter/navigation responses from replacing newer data. */
export class PagedData<T extends {id:string}> {
 readonly items=signal<T[]>([]);readonly total=signal(0);readonly page=signal(0);readonly pageSize=signal(20);
 readonly loading=signal(false);readonly failed=signal(false);readonly hasMore=computed(()=>this.page()*this.pageSize()<this.total());
 private generation=0;
 constructor(private readonly request:(page:number,pageSize:number)=>Promise<PageResult<T>>,private readonly accepted?:(result:PageResult<T>)=>void){}
 reset(){this.page.set(0);this.total.set(0);return this.load(1,false);}
 next(){
  if(this.loading()){return Promise.resolve();}
  if(!this.page()){return this.reset();}
  if(!this.hasMore()){return Promise.resolve();}
  return this.load(this.page()+1,true);
 }
 resize(size:number){
  if(this.loading()||!Number.isInteger(size)||size<1||size>50){return Promise.resolve();}
  this.pageSize.set(size);return this.reset();
 }
 go(page:number){if(this.loading()){return Promise.resolve();}return this.load(page,false);}
 private async load(page:number,append:boolean){
  const generation=append?this.generation:++this.generation;
  this.loading.set(true);this.failed.set(false);
  if(!append)this.items.set([]);
  try{
   const result=await this.request(page,this.pageSize());if(generation!==this.generation)return;
   const items=append?[...this.items(),...result.items]:result.items;
   this.items.set([...new Map(items.map(item=>[item.id,item])).values()]);this.total.set(result.total);this.page.set(result.page);this.pageSize.set(result.pageSize);this.accepted?.(result);
  }catch{if(generation===this.generation)this.failed.set(true);}
  finally{if(generation===this.generation)this.loading.set(false);}
 }
}
