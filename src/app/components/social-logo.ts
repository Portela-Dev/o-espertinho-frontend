import {Component,computed,input,signal} from '@angular/core';
@Component({selector:'social-logo',host:{'aria-hidden':'true'},styles:`:host{display:inline-grid;place-items:center;flex-shrink:0;width:28px;height:28px;border-radius:7px;overflow:hidden;background:#fff;color:#173a2b;font-size:16px;font-weight:700}img{width:100%;height:100%;object-fit:contain;padding:4px}`,template:`@if(safeUrl()&&failed()!==safeUrl()){<img [src]="safeUrl()" alt="" width="28" height="28" referrerpolicy="no-referrer" (error)="failed.set(safeUrl())">}@else{<span>{{name().charAt(0)}}</span>}`})
export class SocialLogo{
 url=input('');name=input('');failed=signal('');
 safeUrl=computed(()=>{const v=this.url();if(/^\/brand\/social\/[a-z0-9-]+\.svg$/.test(v))return v;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}});
}
