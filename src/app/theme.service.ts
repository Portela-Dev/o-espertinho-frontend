import {Injectable,afterNextRender,inject,signal,DestroyRef} from '@angular/core';
import {DOCUMENT} from '@angular/common';

type Theme='light'|'dark';
const storageKey='espertinho-theme';
@Injectable({providedIn:'root'})
export class ThemeService{
 private document=inject(DOCUMENT);
 private destroy=inject(DestroyRef);
 readonly dark=signal(false);
 constructor(){
  // Browser state is read after hydration; SSR never accesses browser globals.
  afterNextRender(()=>{
   const view=this.document.defaultView;if(!view)return;
   const media=view.matchMedia('(prefers-color-scheme: dark)');
   const preference=():Theme|null=>{try{const value=view.localStorage.getItem(storageKey);return value==='dark'||value==='light'?value:null;}catch{return null;}};
   const sync=()=>this.apply(preference()??(media.matches?'dark':'light'));
   const stored=(event:StorageEvent)=>{if(event.key===storageKey||event.key===null)sync();};
   sync();media.addEventListener('change',sync);view.addEventListener('storage',stored);
   this.destroy.onDestroy(()=>{media.removeEventListener('change',sync);view.removeEventListener('storage',stored);});
  });
 }
 toggle(){
  const theme=this.dark()?'light':'dark';this.apply(theme);
  try{this.document.defaultView?.localStorage.setItem(storageKey,theme);}catch{/* Theme still works when storage is disabled. */}
 }
 private apply(theme:Theme){
  this.dark.set(theme==='dark');this.document.documentElement.dataset['theme']=theme;
  this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#101a15':'#173a2b');
 }
}
