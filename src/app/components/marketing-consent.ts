import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetaPixel } from '../meta-pixel';
@Component({
  selector: 'marketing-consent', imports: [RouterLink],
  styles: `
    :host{display:block}
    .consent{position:fixed;bottom:0;left:0;right:0;z-index:1100;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;padding:10px clamp(12px,2vw,24px);padding-bottom:max(10px,env(safe-area-inset-bottom));background:var(--surface);color:var(--ink);border-top:1px solid var(--line);box-shadow:0 -3px 16px #0002}
    .consent h2{font-size:13px;line-height:1.3;letter-spacing:normal;margin:0 0 3px}
    .consent p{font-size:12px;line-height:1.4;margin:0}
    .consent p a{text-decoration:underline;text-underline-offset:2px}
    .consent-actions{display:flex;justify-content:flex-end;gap:6px}
    .consent-actions .button{min-height:28px;padding:5px 9px;font-size:11px;line-height:1.25;border-radius:5px;white-space:nowrap}
    .preferences{display:block;margin:12px auto;background:none;color:var(--ink);border:0;text-decoration:underline;cursor:pointer}
    @media(max-width:640px){.consent{grid-template-columns:minmax(0,1fr);gap:8px}.consent h2{font-size:12px}.consent p{font-size:11px}}
  `,
  template: `@if(pixel.available()){
    <button type="button" class="preferences" (click)="pixel.preferencesOpen.set(true)">Preferências de cookies</button>
    @if(pixel.preferencesOpen()){
      <section class="consent" aria-labelledby="marketing-title" aria-describedby="marketing-description">
        <div class="consent-copy">
          <h2 id="marketing-title">Cookies e privacidade</h2>
          <p id="marketing-description">Usamos cookies essenciais e, com sua permissão, cookies opcionais para medir visitas e cliques e personalizar anúncios. <a routerLink="/privacidade">Política de privacidade</a>.</p>
        </div>
        <div class="consent-actions">
          <button class="button outline" type="button" (click)="pixel.choose(false)">Recusar cookies opcionais</button>
          <button class="button outline" type="button" (click)="pixel.choose(true)">Aceitar cookies</button>
        </div>
      </section>
    }
  }`,
})
export class MarketingConsent { readonly pixel = inject(MetaPixel); }
