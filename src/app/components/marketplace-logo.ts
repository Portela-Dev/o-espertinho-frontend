import {Component,computed,input,signal} from '@angular/core';
@Component({selector:'marketplace-logo',host:{'aria-hidden':'true'},styles:`
:host{display:inline-grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:9px;overflow:hidden;background:var(--surface-soft);color:var(--ink);font-size:18px;font-weight:700;line-height:1}
img{display:block;width:100%;height:100%;object-fit:contain;padding:5px;background:#fff}
`,template:`@if(imageUrl();as src){@if(failedUrl()!==src){<img [src]="src" alt="" width="36" height="36" decoding="async" referrerpolicy="no-referrer" (error)="failedUrl.set(src)">}@else{<span>{{initial()}}</span>}}@else{<span>{{initial()}}</span>}`})
export class MarketplaceLogo{
 url=input('');name=input('');failedUrl=signal('');
 imageUrl=computed(()=>{try{const value=new URL(this.url());return value.protocol==='https:'&&!value.username&&!value.password?value.href:'';}catch{return '';}});
 initial=computed(()=>this.name().trim().charAt(0).toLocaleUpperCase('pt-BR')||'◇');
}
