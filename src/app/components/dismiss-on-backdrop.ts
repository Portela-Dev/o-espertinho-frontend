import {Directive,output} from '@angular/core';

/** Dismiss only gestures that start and finish on the backdrop. */
@Directive({selector:'[dismissOnBackdrop]',host:{'(pointerdown)':'start($event)','(click)':'finish($event)'}})
export class DismissOnBackdrop {
 readonly dismissOnBackdrop=output<void>();
 private startedOutside=false;
 private outside(event:MouseEvent){
  if(event.target!==event.currentTarget){return false;}
  const element=event.currentTarget as HTMLElement;
  if(element.tagName!=='DIALOG'){return true;}
  const rect=element.getBoundingClientRect();
  return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
 }
 start(event:PointerEvent){this.startedOutside=event.button===0&&this.outside(event);}
 finish(event:MouseEvent){
  const dismiss=this.startedOutside&&this.outside(event);
  this.startedOutside=false;
  if(dismiss){this.dismissOnBackdrop.emit();}
 }
}
