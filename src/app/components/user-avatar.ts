import {Component,computed,input,signal} from '@angular/core';

@Component({
  selector:'user-avatar',
  host:{role:'img','[attr.aria-label]':"'Foto de perfil de '+name()"},
  template:`
    @if(imageUrl();as url){
      @if(failedUrl()!==url){
        <img [src]="url" alt="" width="96" height="96" referrerpolicy="no-referrer" decoding="async" (error)="failedUrl.set(url)">
      }@else{<span aria-hidden="true">{{initial()}}</span>}
    }@else{<span aria-hidden="true">{{initial()}}</span>}
  `,
  styles:`
    :host{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;border-radius:inherit;line-height:1;vertical-align:middle}
    img{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit}
  `
})
export class UserAvatar {
  name=input('Usuário');
  photo=input<string|null|undefined>(null);
  failedUrl=signal<string|null>(null);
  imageUrl=computed(()=>{const url=this.photo()?.trim();return url&&/^https:\/\//i.test(url)?url:null;});
  initial=computed(()=>this.name().trim().charAt(0).toLocaleUpperCase('pt-BR')||'?');
}
