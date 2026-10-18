import {Component,ElementRef,inject,input,output,afterRenderEffect} from '@angular/core';
@Component({selector:'app-infinite-scroll',styles:':host{display:block;min-height:1px}.scroll-status{text-align:center;padding:20px}',template:`
<div class="scroll-status" [attr.aria-busy]="busy()">
@if(busy()){<p role="status">Carregando mais…</p>}
@else if(failed()){<p role="alert">Não foi possível carregar os próximos itens.</p><button type="button" class="button outline small" (click)="more.emit()">Tentar novamente</button>}
@else if(hasMore()){<button type="button" class="button outline small" (click)="more.emit()">Carregar mais</button>}
</div>`})
export class InfiniteScroll {
 readonly busy=input(false);readonly failed=input(false);readonly hasMore=input(false);readonly more=output<void>();private readonly element=inject(ElementRef<HTMLElement>);
 constructor(){afterRenderEffect(cleanup=>{
  if(this.busy()||this.failed()||!this.hasMore()||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)&&!this.busy()&&!this.failed()&&this.hasMore())this.more.emit();},{rootMargin:'0px 0px 300px 0px'});
  observer.observe(this.element.nativeElement);cleanup(()=>observer.disconnect());
 });}
}
