import {Component,inject,signal,effect,AfterViewInit,ElementRef,viewChild} from '@angular/core';
import {RouterLink,Router,ActivatedRoute} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {Api} from '../api.service';
@Component({imports:[RouterLink],template:`<div class="login-layout page-width"><section class="login-story"><p class="eyebrow">SEU ESPAÇO DE BOAS ESCOLHAS</p><h1>Seus próximos<br>planos merecem<br><span>bons achados.</span></h1><div class="login-benefits"><p><span>♡</span> Favorite o que chamou sua atenção</p><p><span>▦</span> Crie catálogos para cada plano</p><p><span>⌕</span> Salve buscas do seu jeito</p></div><div class="login-doodle" aria-hidden="true">✳</div></section><section class="login-card"><span class="login-icon">↗</span><h2>Bem-vindo ao Espertinho</h2><p>Entre com sua conta Google para guardar suas boas escolhas.</p><div #googleButton class="google-button"></div>@if(loading()||api.signing()){<p class="muted" role="status">Preparando seu acesso…</p>}@if(unavailable()){<div class="info-box">{{unavailable()}}</div><button class="button outline full" (click)="setup()">Tentar novamente</button>}<p class="legal-small">Ao continuar, você concorda com os <a routerLink="/termos">Termos de Uso</a> e conhece nossa <a routerLink="/privacidade">Política de Privacidade</a>.</p><a routerLink="/" class="text-link">Continuar explorando sem entrar →</a></section></div>`})
export class LoginPage implements AfterViewInit {
  api=inject(Api);router=inject(Router);route=inject(ActivatedRoute);title=inject(Title);button=viewChild<ElementRef<HTMLElement>>('googleButton');loading=signal(true);unavailable=signal('');
  constructor(){effect(()=>{if(this.api.browser&&this.api.user())void this.router.navigateByUrl(this.next());});}
  ngAfterViewInit(){this.title.setTitle('Entrar | O Espertinho');if(this.api.browser)void this.setup();}
  async setup(){this.loading.set(true);this.unavailable.set('');try{
    if(!this.api.ready())await this.api.init();
    if(this.api.user()){await this.router.navigateByUrl(this.next());return;}
    const config=await this.api.get<{googleClientId:string}>('/config');
    if(!config.googleClientId){this.unavailable.set('O login Google ainda não foi configurado pelo administrador. Você pode continuar explorando as ofertas.');return;}
    await this.api.google.prepare(config.googleClientId);
    const element=this.button()?.nativeElement;if(element)this.api.google.renderButton(element);
  }catch(e){this.unavailable.set(e instanceof Error?e.message:'Não foi possível preparar o acesso.');}finally{this.loading.set(false);}}
  private next(){const value=this.route.snapshot.queryParamMap.get('next')||'/';return value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!value.startsWith('/entrar')?value:'/';}
}
