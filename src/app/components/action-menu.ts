import {afterNextRender,Component,DestroyRef,ElementRef,inject,input,viewChild,ViewEncapsulation} from '@angular/core';

@Component({
 selector:'app-action-menu',
 encapsulation:ViewEncapsulation.None,
 host:{'(click)':'onAction($event)'},
 template:`<button #trigger type="button" class="button outline small" [attr.popovertarget]="menuId()" [attr.aria-label]="label()">Ações <span aria-hidden="true">⋮</span></button>
 <fieldset #menu [id]="menuId()" popover="auto" class="admin-actions-menu" [attr.aria-label]="label()" (toggle)="position($event,trigger,menu)"><ng-content/></fieldset>`,
 styles:`app-action-menu{display:inline-block}.admin-actions-menu{box-sizing:border-box;min-inline-size:0;position:fixed;inset:auto;margin:0;width:min(208px,calc(100vw - 16px));max-height:calc(100dvh - 16px);overflow:auto;padding:6px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);box-shadow:0 8px 28px #0003}.admin-actions-menu button,.admin-actions-menu a{box-sizing:border-box;display:block;width:100%;min-height:40px;padding:10px 12px;border:0;border-radius:6px;background:transparent;color:var(--ink);text-align:left;font:inherit;font-size:13px;text-decoration:none;white-space:normal}.admin-actions-menu button:hover:not(:disabled),.admin-actions-menu a:hover{background:var(--hover)}.admin-actions-menu :focus-visible{outline-offset:-3px}.admin-actions-menu .danger-text{color:var(--red)}`
})
export class ActionMenu {
 menuId=input.required<string>();
 label=input('Ações');
 private menu=viewChild<ElementRef<HTMLElement>>('menu');
 private trigger=viewChild<ElementRef<HTMLElement>>('trigger');
 constructor(){
  const destroy=inject(DestroyRef);
  afterNextRender(()=>{
   const scroll=()=>{
    const menu=this.menu()?.nativeElement,trigger=this.trigger()?.nativeElement;
    if(menu?.matches(':popover-open')&&trigger)this.place(trigger,menu);
   };
   const resize=()=>this.close();
   window.addEventListener('scroll',scroll,true);
   window.addEventListener('resize',resize);
   destroy.onDestroy(()=>{window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',resize);});
  });
 }
 onAction(event:MouseEvent){
  const target=event.target;
  if(!(target instanceof Element))return;
  const action=target.closest('button,a');
  if(action&&!action.matches(':disabled')&&this.menu()?.nativeElement.contains(action))this.close();
 }
 private close(){const menu=this.menu()?.nativeElement;if(menu?.matches(':popover-open'))menu.hidePopover();}
 position(event:Event,trigger:HTMLElement,menu:HTMLElement){
  if((event as ToggleEvent).newState!=='open')return;
  this.place(trigger,menu);
 }
 private place(trigger:HTMLElement,menu:HTMLElement){
  const gap=8,width=Math.min(window.innerWidth,document.documentElement.clientWidth,window.visualViewport?.width??window.innerWidth);
  const height=window.visualViewport?.height??window.innerHeight;
  menu.style.width=Math.min(208,width-gap*2)+'px';
  menu.style.maxHeight=Math.max(0,height-gap*2)+'px';
  const anchor=trigger.getBoundingClientRect(),bounds=menu.getBoundingClientRect();
  menu.style.left=Math.max(gap,Math.min(anchor.right-bounds.width,width-bounds.width-gap))+'px';
  const below=anchor.bottom+gap;
  menu.style.top=(below+bounds.height<=height-gap?below:Math.max(gap,anchor.top-bounds.height-gap))+'px';
 }
}
