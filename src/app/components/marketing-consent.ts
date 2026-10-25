import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetaPixel } from '../meta-pixel';
@Component({
  selector: 'marketing-consent', imports: [RouterLink],
  styles: `:host{display:block}.consent{position:fixed;bottom:16px;left:16px;right:16px;max-width:620px;z-index:1100;margin:auto;padding:20px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 8px 40px #0003}.consent h2{font-size:20px;margin:0 0 10px}.consent p{margin:0 0 16px;line-height:1.5}.consent-actions{display:flex;gap:12px;flex-wrap:wrap}.preferences{display:block;margin:12px auto;background:none;color:var(--ink);border:0;text-decoration:underline;cursor:pointer}`,
  template: `@if(pixel.available()){
    <button type="button" class="preferences" (click)="pixel.preferencesOpen.set(true)">Preferências de privacidade</button>
    @if(pixel.preferencesOpen()){
      <section class="consent" aria-labelledby="marketing-title" aria-describedby="marketing-description">
        <h2 id="marketing-title">Cookies de marketing</h2>
        <p id="marketing-description">Com sua permissão, usamos o Pixel Meta para medir visitas e cliques em ofertas e personalizar publicidade. Você pode recusar ou mudar sua escolha a qualquer momento. <a routerLink="/privacidade">Política de privacidade</a>.</p>
        <div class="consent-actions">
          <button class="button outline" type="button" (click)="pixel.choose(false)">Recusar marketing</button>
          <button class="button outline" type="button" (click)="pixel.choose(true)">Aceitar marketing</button>
        </div>
      </section>
    }
  }`,
})
export class MarketingConsent { readonly pixel = inject(MetaPixel); }
