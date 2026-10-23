import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
export interface GoogleCredential {
  credential: string;
  select_by?: string;
}
interface GoogleIdentity {
  initialize: (options: Record<string, unknown>) => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => void;
  prompt?: (listener?: (moment: unknown) => void) => void;
  cancel?: () => void;
  disableAutoSelect?: () => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}
@Injectable({ providedIn: 'root' })
export class GoogleSignIn {
  private document = inject(DOCUMENT);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private loading?: Promise<void>;
  private clientId = '';
  private manualElement?: HTMLElement;
  private suppressed = false;
  onCredential?: (credential: string, automatic: boolean) => void;
  async prepare(clientId: string) {
    if (!this.browser) {
      return;
    }
    this.reauthClientId = clientId;
    this.loading ??= this.load().catch((e) => {
      this.loading = undefined;
      throw e;
    });
    await this.loading;
    if (this.clientId === clientId) return;
    window.google!.accounts.id.initialize({
      client_id: clientId,
      auto_select: true,
      use_fedcm_for_prompt: true,
      callback: (r: GoogleCredential) => {
        const automatic =
          r.select_by === 'auto' ||
          r.select_by === 'fedcm_auto' ||
          !this.manualElement?.isConnected;
        if (automatic && this.suppressed) return;
        if (r.credential) this.onCredential?.(r.credential, automatic);
      },
    });
    this.clientId = clientId;
  }
  private load(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.document.getElementById('google-identity')?.remove();
      const script = this.document.createElement('script');
      script.id = 'google-identity';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        reject(
          new Error('O login Google demorou para responder. Tente novamente.'),
        );
      }, 10000);
      script.onload = () => {
        clearTimeout(timer);
        window.google?.accounts?.id
          ? resolve()
          : reject(new Error('O login Google não está disponível.'));
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(
          new Error(
            'Não foi possível carregar o login Google. Confira bloqueadores e conexão.',
          ),
        );
      };
      this.document.head.appendChild(script);
    });
  }
  renderReauthentication(
    element: HTMLElement,
    nonce: string,
    onCredential: (credential: string) => void,
  ) {
    this.clientId = '';
    window.google!.accounts.id.initialize({
      client_id: this.reauthClientId,
      nonce,
      auto_select: false,
      callback: (r: GoogleCredential) => {
        if (r.credential) onCredential(r.credential);
      },
    });
    window.google!.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      locale: 'pt-BR',
    });
  }
  private reauthClientId = '';
  renderButton(element: HTMLElement) {
    this.manualElement = element;
    element.replaceChildren();
    window.google!.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      width: 300,
      text: 'continue_with',
      locale: 'pt-BR',
    });
  }
  prompt() {
    if (!this.suppressed) window.google?.accounts.id.prompt?.();
  }
  suppress() {
    this.suppressed = true;
    if (this.browser) {
      window.google?.accounts.id.cancel?.();
      window.google?.accounts.id.disableAutoSelect?.();
    }
  }
  allow() {
    this.suppressed = false;
  }
}
