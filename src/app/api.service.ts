import {Injectable,inject,signal,PLATFORM_ID,DestroyRef} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient,HttpErrorResponse,HttpParams} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {GoogleSignIn} from './google-sign-in.service';
import type {User,Offer} from './models';
@Injectable({providedIn:'root'})
export class Api {
  private http=inject(HttpClient);google=inject(GoogleSignIn);private destroy=inject(DestroyRef);
  signing=signal(false);private autoAllowed=true;private silentAttempted=false;private authGeneration=0;private localSuppressed=false;
  private readonly signedOutKey='espertinho-auth-signed-out';private readonly returningKey='espertinho-auth-returning';
  constructor(){
    this.google.onCredential=(credential,automatic)=>void this.signInGoogle(credential,automatic).catch(e=>{if(!automatic)this.fail(e);});
    if(this.browser){
      if(this.wasSignedOut())this.google.suppress();
      const onStorage=(event:StorageEvent)=>{if(event.key===this.signedOutKey&&event.newValue==='1'){this.suppressAutomaticLogin();this.user.set(null);this.favorites.set(new Set());}};
      window.addEventListener('storage',onStorage);this.destroy.onDestroy(()=>window.removeEventListener('storage',onStorage));
    }
  }
  private readPreference(key:string){try{return this.browser?localStorage.getItem(key):null;}catch{return null;}}
  private writePreference(key:string,value:string){try{if(this.browser)localStorage.setItem(key,value);}catch{}}
  private wasSignedOut(){return this.localSuppressed||this.readPreference(this.signedOutKey)==='1';}
  private suppressAutomaticLogin(){this.cancelReauthentication();this.localSuppressed=true;this.authGeneration++;this.writePreference(this.signedOutKey,'1');this.google.suppress();}
  forgetAccount(){this.suppressAutomaticLogin();this.writePreference(this.returningKey,'0');this.user.set(null);this.favorites.set(new Set());}
  private async attemptSilentLogin(){
    if(this.silentAttempted||this.user()||!this.autoAllowed||this.wasSignedOut()||this.readPreference(this.returningKey)!=='1')return;
    this.silentAttempted=true;const generation=this.authGeneration;
    try{const config=await this.get<{googleClientId:string}>('/config');if(!config.googleClientId)return;await this.google.prepare(config.googleClientId);if(generation===this.authGeneration&&!this.wasSignedOut()&&!this.user())this.google.prompt();}catch{/* Optional Google restoration must never block browsing. */}
  }
  async signInGoogle(credential:string,automatic=false){
    if(this.signing()||automatic&&(!this.autoAllowed||this.wasSignedOut()||this.user()))return;
    this.signing.set(true);const generation=this.authGeneration;
    try{
      const r=await this.send<{user:User}>('POST','/auth/google',{credential,automatic});
      if(generation!==this.authGeneration)return;
      this.user.set(r.user);this.autoAllowed=true;this.localSuppressed=false;this.writePreference(this.signedOutKey,'0');this.writePreference(this.returningKey,'1');this.google.allow();
      try{await this.loadFavorites();}catch(e){this.fail(e);}
    }finally{this.signing.set(false);}
  }
  user=signal<User|null>(null);ready=signal(false);notice=signal('');error=signal('');favorites=signal(new Set<string>());
  canAdmin(permission?:string){const u=this.user();return !!u&&(u.role==='admin'||(permission?u.permissions?.includes(permission):!!u.permissions?.length));}
  adminSection(section:string){const permissions:Record<string,string>={purge:'purge',discovery:'discovery',overview:'overview',products:'catalog',links:'catalog',offers:'catalog',marketplaces:'marketplaces',selectors:'selectors',updates:'updates',activity:'activity',users:'users',profiles:'users'};if(section==='updates'){return ['updates','catalog','discovery'].some(permission=>this.canAdmin(permission));}return this.user()?.role==='admin'||!!permissions[section]&&this.canAdmin(permissions[section]);}
  firstAdminSection(){return ['overview','products','discovery','marketplaces','selectors','updates','purge','activity','users'].find(s=>this.adminSection(s))||'overview';}
  browser=isPlatformBrowser(inject(PLATFORM_ID));
  get<T>(path:string,query?:Record<string,unknown>):Promise<T>{let params=new HttpParams();for(const [k,v] of Object.entries(query??{}))if(v!==null&&v!==undefined)params=params.set(k,String(v));return firstValueFrom(this.http.get<T>('/api'+path,{params}));}
  reauthNonce=signal('');private reauthPending?:{promise:Promise<void>;resolve:()=>void;reject:(e:Error)=>void};
  async send<T=any>(method:string,path:string,body?:unknown):Promise<T>{
    const generation=this.authGeneration,owner=this.user()?.id;
    try{return await firstValueFrom(this.http.request<T>(method,'/api'+path,{body}));}
    catch(error){
      if(!(error instanceof HttpErrorResponse)||error.error?.code!=='ADMIN_REAUTH_REQUIRED')throw error;
      if(generation!==this.authGeneration||owner!==this.user()?.id)throw new Error('A sessão mudou. Entre novamente.');
      await this.requestReauthentication();
      if(generation!==this.authGeneration||!this.user()||owner!==this.user()?.id)throw new Error('A sessão mudou. Entre novamente.');
      return firstValueFrom(this.http.request<T>(method,'/api'+path,{body}));
    }
  }
  private async requestReauthentication(){
    if(this.reauthPending)return this.reauthPending.promise;
    let resolve!:()=>void,reject!:(e:Error)=>void;
    const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    void promise.catch(()=>{});
    const pending={promise,resolve,reject};this.reauthPending=pending;
    try{const challenge=await firstValueFrom(this.http.post<{nonce:string}>('/api/auth/reauth/challenge',{}));if(this.reauthPending===pending)this.reauthNonce.set(challenge.nonce);}
    catch(error){if(this.reauthPending===pending){this.reauthPending=undefined;reject(error instanceof Error?error:new Error('Não foi possível confirmar a conta.'));}}
    return promise;
  }
  async confirmReauthentication(credential:string){
    await firstValueFrom(this.http.post('/api/auth/reauth',{credential}));
    const pending=this.reauthPending;this.reauthPending=undefined;this.reauthNonce.set('');pending?.resolve();
  }
  cancelReauthentication(){const pending=this.reauthPending;this.reauthPending=undefined;this.reauthNonce.set('');pending?.reject(new Error('Confirmação de segurança cancelada.'));}

  private initPromise?:Promise<void>;
  init():Promise<void>{if(!this.browser)return Promise.resolve();if(this.initPromise)return this.initPromise;this.initPromise=(async()=>{try{const r=await this.get<{user:User|null;autoSignInAllowed?:boolean}>('/auth/session');this.user.set(r.user);this.autoAllowed=r.autoSignInAllowed!==false;if(r.user){this.writePreference(this.returningKey,'1');await this.loadFavorites();}else void this.attemptSilentLogin();}catch(e){this.fail(e);this.initPromise=undefined;}finally{this.ready.set(true);}})();return this.initPromise;}
  async loadFavorites(){const offers=await this.get<Offer[]>('/me/favorites');this.favorites.set(new Set(offers.map(o=>o.id)));}
  async toggleFavorite(id:string){const remove=this.favorites().has(id);await this.send(remove?'DELETE':'PUT','/me/favorites/'+id);const next=new Set(this.favorites());remove?next.delete(id):next.add(id);this.favorites.set(next);this.success(remove?'Oferta removida dos favoritos.':'Oferta salva nos favoritos.');}
  async logout(){this.suppressAutomaticLogin();await this.send('POST','/auth/logout',{});this.user.set(null);this.favorites.set(new Set());}
  success(message:string){this.error.set('');this.notice.set(message);}
  fail(e:unknown){this.notice.set('');this.error.set(e instanceof HttpErrorResponse?(e.error?.error||'Não foi possível conectar ao servidor.'):e instanceof Error?e.message:'Não foi possível concluir.');}
  clear(){this.notice.set('');this.error.set('');}
}
