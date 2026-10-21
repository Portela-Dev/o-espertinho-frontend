import {Component,computed,effect,input,signal} from '@angular/core';

@Component({selector:'expandable-description',styles:`:host{display:block;margin:0 0 20px;min-width:0}p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.toggle{display:inline-block;margin-top:8px;text-decoration:underline;text-underline-offset:3px}`,
template:`<p>{{displayed()}}</p>@if(long()){<button type="button" class="text-button toggle" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">{{expanded()?'Ver menos':'Ver mais'}}</button>}`})
export class ExpandableDescription {
 text=input('');expanded=signal(false);
 long=computed(()=>this.text().length>360);
 displayed=computed(()=>{
  const text=this.text();if(this.expanded()||!this.long())return text;
  const part=text.slice(0,360),boundary=part.lastIndexOf(' ');
  return part.slice(0,boundary>280?boundary:360).trimEnd()+'…';
 });
 constructor(){effect(()=>{this.text();this.expanded.set(false);});}
}
