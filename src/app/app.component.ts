import { Component, inject, OnInit, ElementRef, viewChild, signal } from '@angular/core';
import { DismissOnBackdrop } from './components/dismiss-on-backdrop';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
} from '@angular/router';
import { AdminReauth } from './components/admin-reauth';
import { Api } from './api.service';
import { ThemeService } from './theme.service';
import { UserAvatar } from './components/user-avatar';
@Component({
  selector: 'app-root',
  imports: [
    DismissOnBackdrop,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    UserAvatar,
    AdminReauth,
  ],
  template: `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div class="topline">
      Um bom achado começa com uma boa escolha.
      <span>Ofertas revisadas por pessoas, para pessoas.</span>
    </div>
    <header class="site-header">
      <div class="header-inner">
        <a routerLink="/" class="brand" aria-label="O Espertinho início"
          ><span class="brand-mascot" aria-hidden="true"
            ><img
              src="/brand/espertinho-mascote-caramelo-v9-384.png"
              alt=""
              width="132"
              height="132" /></span
          >O Espertinho<span class="brand-dot">.</span></a
        >
        <nav class="desktop-site-navigation" aria-label="Navegação principal">
          <a
            routerLink="/"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="active"
            >Explorar</a
          ><a routerLink="/favoritos" routerLinkActive="active">Favoritos</a
          ><a routerLink="/catalogos" routerLinkActive="active"
            >Meus catálogos</a
          >
        </nav>
        <div class="account-nav">
          <button
            type="button"
            class="theme-toggle"
            (click)="theme.toggle()"
            aria-label="Tema escuro"
            [attr.aria-pressed]="theme.dark()"
            [title]="theme.dark() ? 'Ativar tema claro' : 'Ativar tema escuro'"
          >
            <svg
              class="theme-moon"
              aria-hidden="true"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z" /></svg
            ><svg
              class="theme-sun"
              aria-hidden="true"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
              />
            </svg>
          </button>
          @if (api.user(); as user) {
            @if (api.canAdmin()) {
              <a routerLink="/admin" class="admin-link">Admin <span>↗</span></a>
            }
            <a
              routerLink="/minha-conta"
              class="avatar"
              [attr.aria-label]="'Conta de ' + user.name"
              ><user-avatar [name]="user.name" [photo]="user.avatar"
            /></a>
          } @else {
            <a routerLink="/entrar" class="button small dark"
              >Entrar <span>↗</span></a
            >
          }
          <button type="button" class="mobile-nav-toggle" (click)="openMobileNavigation()" aria-label="Abrir menu" aria-haspopup="dialog" aria-controls="mobile-site-navigation" [attr.aria-expanded]="mobileNavigationOpen()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>
    </header>
    <dialog #mobileNavigation id="mobile-site-navigation" class="mobile-browse-menu mobile-navigation-dialog" aria-labelledby="mobile-navigation-title" (dismissOnBackdrop)="closeMobileNavigation()" (close)="mobileNavigationOpen.set(false)">
      <div class="browse-menu-heading"><h2 id="mobile-navigation-title">Menu</h2><button type="button" class="button outline" (click)="closeMobileNavigation()" aria-label="Fechar menu">×</button></div>
      @if(api.user(); as user) {
        <a routerLink="/minha-conta" class="mobile-menu-profile" (click)="closeMobileNavigation()" [attr.aria-label]="'Conta de ' + user.name">
          <span class="avatar"><user-avatar [name]="user.name" [photo]="user.avatar" /></span>
          <span class="mobile-menu-profile-copy"><strong>{{user.name}}</strong><span>Minha conta ↗</span></span>
        </a>
      }
      <nav aria-label="Navegação mobile">
        <a routerLink="/" (click)="closeMobileNavigation()" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active">Explorar</a>
        <a routerLink="/favoritos" (click)="closeMobileNavigation()" routerLinkActive="active">Favoritos</a>
        <a routerLink="/catalogos" (click)="closeMobileNavigation()" routerLinkActive="active">Meus catálogos</a>
        @if(api.user()) {
          @if(api.canAdmin()){<a routerLink="/admin" (click)="closeMobileNavigation()">Admin ↗</a>}
        } @else {
          <a routerLink="/entrar" (click)="closeMobileNavigation()">Entrar</a>
        }
      </nav>
      <section class="mobile-menu-theme" aria-labelledby="mobile-theme-title">
        <h3 id="mobile-theme-title">Aparência</h3>
        <div class="mobile-theme-options" role="group" aria-label="Tema do site">
          <button type="button" (click)="setTheme(false)" [attr.aria-pressed]="!theme.dark()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>Claro
          </button>
          <button type="button" (click)="setTheme(true)" [attr.aria-pressed]="theme.dark()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/></svg>Escuro
          </button>
        </div>
      </section>
    </dialog>
    @if (api.error()) {
      <div class="toast error" role="alert">
        <span>{{ api.error() }}</span
        ><button
          type="button"
          (click)="api.clear()"
          aria-label="Fechar mensagem"
        >
          ×
        </button>
      </div>
    }
    @if (api.notice()) {
      <output aria-live="polite" class="toast"
        ><span>{{ api.notice() }}</span
        ><button
          type="button"
          (click)="api.clear()"
          aria-label="Fechar mensagem"
        >
          ×
        </button></output
      >
    }
    <admin-reauth />
    <main id="conteudo"><router-outlet /></main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <a routerLink="/" class="brand">O Espertinho.</a>
          <p>Menos procura. Mais boas escolhas.</p>
        </div>
        <div class="footer-links">
          <a routerLink="/sobre">Sobre o Espertinho</a
          ><a routerLink="/privacidade">Privacidade</a
          ><a routerLink="/termos">Termos de uso</a>
        </div>
      </div>
      <div class="disclosure">
        Como participante do Programa de Associados da Amazon, sou remunerado
        pelas compras qualificadas efetuadas. Podemos receber comissão pelas
        compras realizadas nos links de outras lojas, sem custo adicional para
        você.
      </div>
    </footer>
  `,
})
export class AppComponent implements OnInit {
  setTheme(dark: boolean) { if (this.theme.dark() !== dark) this.theme.toggle(); }
  readonly mobileNavigation = viewChild<ElementRef<HTMLDialogElement>>('mobileNavigation');
  readonly mobileNavigationOpen = signal(false);
  openMobileNavigation() {
    const dialog = this.mobileNavigation()?.nativeElement;
    if(dialog && !dialog.open) { this.mobileNavigationOpen.set(true); dialog.showModal(); }
  }
  closeMobileNavigation() { this.mobileNavigation()?.nativeElement.close(); this.mobileNavigationOpen.set(false); }

  api = inject(Api);
  theme = inject(ThemeService);
  router = inject(Router);
  ngOnInit() {
    void this.api.init();
  }
}
