import { Component, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Offer } from '../models';
import {
  Sharing,
  SharingChannel,
  shareText,
  shareDestination,
} from '../sharing';
import { Api } from '../api.service';
import { DismissOnBackdrop } from './dismiss-on-backdrop';
import { SocialLogo } from './social-logo';
@Component({
  selector: 'offer-share',
  imports: [DismissOnBackdrop, SocialLogo],
  styles: `
    :host {
      display: block;
    }
    .share-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0;
    }
    .share-networks {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }
    .share-networks button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--surface);
      color: var(--ink);
      font-size: 12px;
    }
    .share-networks button[aria-pressed='true'] {
      background: var(--surface-soft);
      border-color: var(--accent);
    }
    .share-preview {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: 14px;
      border-radius: 9px;
      background: var(--surface-inset);
      max-height: 200px;
      overflow: auto;
    }
    .share-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .share-dialog {
      width: min(560px, 100%);
    }
  `,
  template: `
    @if (sharing.settings()?.enabled && sharing.settings()?.channels?.length) {
      <button
        type="button"
        class="text-button share-trigger"
        (click)="open()"
        [attr.aria-label]="'Compartilhar oferta ' + offer().title"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg
        >Compartilhar
      </button>
    }
    @if (opened()) {
      <div class="modal-backdrop" (dismissOnBackdrop)="opened.set(false)">
        <dialog
          open
          class="modal share-dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          (keydown.escape)="opened.set(false)"
        >
          <button
            type="button"
            class="close-button"
            aria-label="Fechar"
            (click)="opened.set(false)"
          >
            ×
          </button>
          <h2 id="share-title">Compartilhar oferta</h2>
          <div class="share-networks" role="group" aria-label="Redes sociais">
            @for (
              channel of sharing.settings()?.channels || [];
              track channel.id
            ) {
              <button
                type="button"
                [attr.aria-pressed]="selected()?.id === channel.id"
                (click)="select(channel)"
              >
                <social-logo [url]="channel.logoUrl" [name]="channel.name" />{{
                  channel.name
                }}
              </button>
            }
          </div>
          @if (selected(); as channel) {
            <p class="share-preview">{{ text() }}</p>
            @if (
              channel.action === 'copy' ||
              !channel.urlTemplate.includes('{texto}')
            ) {
              <p class="muted legal-small">
                Copie o texto para usá-lo na publicação. Esta rede não preenche
                a mensagem automaticamente pelo link.
              </p>
            }
            <div class="share-actions">
              <button
                type="button"
                class="button outline"
                (click)="copy(text())"
              >
                Copiar texto</button
              ><button
                type="button"
                class="button outline"
                (click)="copy(url())"
              >
                Copiar link
              </button>
              @if (channel.action === 'url' && destination()) {
                <a
                  class="button dark"
                  [href]="destination()"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Abrir {{ channel.name }} ↗</a
                >
              }
            </div>
          }
        </dialog>
      </div>
    }
  `,
})
export class OfferShare {
  offer = input.required<Offer>();
  sharing = inject(Sharing);
  api = inject(Api);
  document = inject(DOCUMENT);
  opened = signal(false);
  selected = signal<SharingChannel | null>(null);
  url = signal('');
  text = signal('');
  destination = signal('');
  constructor() {
    void this.sharing.load();
  }
  open() {
    const origin = this.document.defaultView?.location.origin;
    if (!origin) return;
    this.url.set(new URL('/oferta/' + this.offer().id, origin).href);
    this.opened.set(true);
    const first = this.sharing.settings()?.channels[0];
    if (first) this.select(first);
  }
  select(channel: SharingChannel) {
    this.selected.set(channel);
    const text = shareText(channel, this.offer(), this.url());
    this.text.set(text);
    this.destination.set(
      shareDestination(channel, this.offer(), this.url(), text),
    );
  }
  async copy(text: string) {
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard)
        throw new Error(
          'Não foi possível copiar automaticamente. Selecione o texto da prévia.',
        );
      await clipboard.writeText(text);
      this.api.success('Copiado para a área de transferência.');
    } catch (e) {
      this.api.fail(e);
    }
  }
}
