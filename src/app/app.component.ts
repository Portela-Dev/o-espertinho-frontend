import {Component,inject,OnInit} from '@angular/core';
import {RouterLink,RouterLinkActive,RouterOutlet,Router} from '@angular/router';
import {AdminReauth} from './components/admin-reauth';
import {Api} from './api.service';
import {ThemeService} from './theme.service';
import {UserAvatar} from './components/user-avatar';
@Component({selector:'app-root',imports:[RouterLink,RouterLinkActive,RouterOutlet,UserAvatar,AdminReauth],template:`
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="topline">Um bom achado começa com uma boa escolha. <span>Ofertas revisadas por pessoas, para pessoas.</span></div>
  <header class="site-header"><div class="header-inner">
    <a routerLink="/" class="brand" aria-label="O Espertinho início"><img src="/brand/espertinho-icon-contrast-512-v3.png" alt="" width="72" height="72">O Espertinho<span class="brand-dot">.</span></a>
    <nav aria-label="Navegação principal"><a routerLink="/" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active">Explorar</a><a routerLink="/favoritos" routerLinkActive="active">Favoritos</a><a routerLink="/catalogos" routerLinkActive="active">Meus catálogos</a></nav>
    <div class="account-nav"><button type="button" class="theme-toggle" (click)="theme.toggle()" aria-label="Tema escuro" [attr.aria-pressed]="theme.dark()" [title]="theme.dark()?'Ativar tema claro':'Ativar tema escuro'"><svg class="theme-moon" aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/></svg><svg class="theme-sun" aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button>@if(api.user(); as user){@if(api.canAdmin()){<a routerLink="/admin" class="admin-link">Admin <span>↗</span></a>}<a routerLink="/minha-conta" class="avatar" [attr.aria-label]="'Conta de '+user.name"><user-avatar [name]="user.name" [photo]="user.avatar" /></a>}@else{<a routerLink="/entrar" class="button small dark">Entrar <span>↗</span></a>}</div>
  </div></header>
  @if(api.error()){<div class="toast error" role="alert"><span>{{api.error()}}</span><button type="button" (click)="api.clear()" aria-label="Fechar mensagem">×</button></div>}
  @if(api.notice()){<div class="toast" role="status"><span>{{api.notice()}}</span><button type="button" (click)="api.clear()" aria-label="Fechar mensagem">×</button></div>}
  <admin-reauth />
  <main id="conteudo"><router-outlet /></main>
  <footer class="site-footer"><div class="footer-inner"><div><a routerLink="/" class="brand">O Espertinho.</a><p>Menos procura. Mais boas escolhas.</p></div><div class="footer-links"><a routerLink="/sobre">Sobre o Espertinho</a><a routerLink="/privacidade">Privacidade</a><a routerLink="/termos">Termos de uso</a></div></div><div class="disclosure">Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas. Podemos receber comissão pelas compras realizadas nos links de outras lojas, sem custo adicional para você.</div></footer>
`})
export class AppComponent implements OnInit {api=inject(Api);theme=inject(ThemeService);router=inject(Router);ngOnInit(){void this.api.init();}}
