import {Component,ElementRef,ViewChild,input,signal} from '@angular/core';
import {DismissOnBackdrop} from './dismiss-on-backdrop';

@Component({selector:'offer-photo-gallery',imports:[DismissOnBackdrop],styles:`
:host{display:block;min-width:0}.thumbnails{display:flex;gap:10px;overflow-x:auto;padding:12px 0}
.thumbnail{flex:0 0 auto;padding:4px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}
.thumbnail img{display:block;width:70px;height:70px;object-fit:contain}.thumbnail:hover,.thumbnail[aria-current=true]{border-color:var(--accent)}
dialog{width:min(960px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);margin:auto;padding:22px;border:1px solid var(--line);border-radius:16px;color:var(--ink);background:var(--surface);overflow:auto;box-shadow:0 20px 80px #0005}
dialog::backdrop{background:#000b}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.heading h2{font-size:19px;margin:0;overflow-wrap:anywhere}.close{flex-shrink:0;min-width:44px;min-height:44px;font-size:26px;border-radius:8px;background:var(--surface-inset);color:var(--ink)}
.viewer{position:relative;height:min(55dvh,540px);display:grid;place-items:center;min-width:0;background:#f8f8f2;border-radius:10px;touch-action:pan-y;overflow:hidden}.viewer img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center}.viewer p{padding:20px;text-align:center;color:#1c3027}
.controls{display:flex;align-items:center;justify-content:center;gap:20px;margin:16px 0 0}.controls button{min-width:44px;min-height:44px;border-radius:8px;color:var(--ink);background:var(--surface-inset);font-size:22px}.counter{font-size:13px;min-width:80px;text-align:center}.dialog-thumbnails{margin-top:8px}.dialog-thumbnails .thumbnail img{width:52px;height:52px}
@media(max-width:600px){dialog{padding:14px}.heading h2{font-size:16px}.viewer{height:45dvh}.controls{gap:14px}}
`,template:`
<div class="thumbnails" aria-label="Fotos da oferta">
 @for(image of images();track $index){<button type="button" class="thumbnail" [attr.aria-label]="'Ampliar foto '+($index+1)+' de '+images().length" (click)="open($index)"><img [src]="image" [alt]="title()+' — foto '+($index+1)" loading="lazy" referrerpolicy="no-referrer"></button>}
</div>
<dialog #gallery aria-label="Galeria de fotos da oferta" (dismissOnBackdrop)="close()" (close)="opened.set(false)" (keydown)="key($event)">
 <div class="heading"><h2>{{title()}}</h2><button class="close" type="button" autofocus aria-label="Fechar galeria" (click)="close()">×</button></div>
 @if(opened()){
  <div class="viewer" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
   @if(failed()){<p role="status">Não foi possível carregar esta foto. Escolha outra imagem.</p>}
   @else{<img [src]="images()[selected()]" [alt]="title()+' — foto '+(selected()+1)+' de '+images().length" referrerpolicy="no-referrer" draggable="false" (error)="failed.set(true)">}
  </div>
  <div class="controls"><button type="button" aria-label="Foto anterior" (click)="move(-1)">←</button><span class="counter" role="status" aria-live="polite">{{selected()+1}} / {{images().length}}</span><button type="button" aria-label="Próxima foto" (click)="move(1)">→</button></div>
  <div class="thumbnails dialog-thumbnails" aria-label="Escolher foto">
   @for(image of images();track $index){<button type="button" class="thumbnail" [attr.aria-label]="'Ver foto '+($index+1)" [attr.aria-current]="selected()===$index?'true':null" (click)="choose($index)"><img [src]="image" alt="" loading="lazy" referrerpolicy="no-referrer"></button>}
  </div>
 }
</dialog>`})
export class OfferPhotoGallery {
 images=input.required<string[]>();title=input('Fotos da oferta');selected=signal(0);opened=signal(false);failed=signal(false);
 @ViewChild('gallery',{static:true}) gallery!:ElementRef<HTMLDialogElement>;
 private touch?:{x:number;y:number};
 open(index:number){this.choose(index);this.opened.set(true);this.gallery.nativeElement.showModal();}
 close(){this.gallery.nativeElement.close();this.opened.set(false);}
 choose(index:number){this.selected.set(index);this.failed.set(false);}
 move(direction:number){const count=this.images().length;if(count)this.choose((this.selected()+direction+count)%count);}
 key(event:KeyboardEvent){if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();this.move(event.key==='ArrowLeft'?-1:1);}}
 touchStart(event:TouchEvent){const point=event.touches[0];this.touch=event.touches.length===1?{x:point.clientX,y:point.clientY}:undefined;}
 touchEnd(event:TouchEvent){const point=event.changedTouches[0],start=this.touch;this.touch=undefined;if(!start||!point)return;const x=point.clientX-start.x,y=point.clientY-start.y;if(Math.abs(x)>50&&Math.abs(x)>Math.abs(y))this.move(x<0?1:-1);}
}
