import {DismissOnBackdrop} from './dismiss-on-backdrop';
import {Component,inject,effect,viewChild,ElementRef,signal} from '@angular/core';
import {Api} from '../api.service';
@Component({imports:[DismissOnBackdrop],selector:'admin-reauth',styles:':host .modal-backdrop{z-index:2000}',template:`@if(api.reauthNonce()){<div class="modal-backdrop" (dismissOnBackdrop)="api.cancelReauthentication()"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="reauth-title"><h2 id="reauth-title">Confirme sua conta</h2><p>Para continuar, confirme a mesma conta Google conectada ao site.</p><div #button></div>@if(error()){<p role="alert">{{error()}}</p>}<button type="button" class="button outline" (click)="api.cancelReauthentication()">Cancelar</button></section></div>}`})
export class AdminReauth{
 api=inject(Api);button=viewChild<ElementRef<HTMLElement>>('button');error=signal('');
 constructor(){effect(()=>{const nonce=this.api.reauthNonce(),element=this.button()?.nativeElement;if(nonce&&element)void this.render(nonce,element);});}
 private async render(nonce:string,element:HTMLElement){
  this.error.set('');
  try{
   const config=await this.api.get<{googleClientId:string}>('/config');
   await this.api.google.prepare(config.googleClientId);
   if(this.api.reauthNonce()!==nonce){return;}
   this.api.google.renderReauthentication(element,nonce,credential=>{
    void this.api.confirmReauthentication(credential).catch(()=>{
     this.error.set('Não foi possível confirmar. Use a mesma conta conectada ou cancele para tentar novamente.');
    });
   });
  }
  catch{this.error.set('Não foi possível carregar o Google. Cancele e tente novamente.');}
 }
}
