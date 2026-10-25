import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

interface PixelConfig { enabled: boolean; pixelId: string | null; allowedOrigin: string }
interface PixelFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: PixelFunction;
  loaded: boolean;
  version: string;
}
type PixelWindow = Window & { fbq?: PixelFunction; _fbq?: PixelFunction };
const consentKey = 'espertinho-marketing-consent-v1';
const consentLifetime = 180 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MetaPixel {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly available = signal(false);
  readonly preferencesOpen = signal(false);
  readonly consent = signal<boolean | null>(null);
  private config?: PixelConfig;
  private started = false;
  private ready = false;
  private initialized = false;
  private script?: HTMLScriptElement;
  private page = '';
  private content?: { path: string; id: string; kind: 'product' | 'offer' };
  private contentSent = '';
  private get window() { return this.document.defaultView as PixelWindow | null; }

  async start() {
    if (!this.browser || this.started) return;
    this.started = true;
    const window = this.window;
    if (!window) return;
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe(event => {
      if (event instanceof NavigationEnd) this.visit();
    });
    const changed = (event: StorageEvent) => {
      if (event.key === consentKey || event.key === null) {
        this.readConsent(); this.preferencesOpen.set(this.consent() === null); this.applyConsent();
      }
    };
    window.addEventListener('storage', changed);
    this.destroy.onDestroy(() => window.removeEventListener('storage', changed));
    try {
      const config = await firstValueFrom(this.http.get<PixelConfig>('/api/marketing'));
      if (!config.enabled || !/^[0-9]{5,30}$/.test(config.pixelId ?? '') || config.allowedOrigin !== window.location.origin) return;
      this.config = config;
      this.available.set(true);
      this.readConsent();
      this.preferencesOpen.set(this.consent() === null);
      this.applyConsent();
    } catch { /* Optional marketing must never interrupt navigation. */ }
  }
  private readConsent() {
    try {
      const value = JSON.parse(this.window?.localStorage.getItem(consentKey) ?? 'null');
      this.consent.set(typeof value?.granted === 'boolean' && Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < consentLifetime ? value.granted : null);
    } catch { this.consent.set(null); }
  }
  choose(granted: boolean) {
    this.consent.set(granted);
    try { this.window?.localStorage.setItem(consentKey, JSON.stringify({ granted, at: Date.now() })); } catch { /* Respect the current choice even if storage is blocked. */ }
    this.preferencesOpen.set(false);
    this.applyConsent();
  }
  private applyConsent() {
    if (this.consent() === true) { this.visit(); return; }
    this.window?.fbq?.('consent', 'revoke');
    this.page = ''; this.contentSent = '';
    this.clearCookies();
  }
  private clearCookies() {
    const hostname = this.window?.location.hostname;
    if (!hostname) return;
    const parts = hostname.split('.');
    for (const cookie of ['_fbp', '_fbc']) {
      this.document.cookie = `${cookie}=; Max-Age=0; Path=/; SameSite=Lax`;
      for (let index = 0; index < parts.length - 1; index++) {
        this.document.cookie = `${cookie}=; Max-Age=0; Path=/; Domain=${parts.slice(index).join('.')}; SameSite=Lax`;
      }
    }
  }
  private publicPage() {
    const location = this.window?.location;
    if (!location || location.origin !== this.config?.allowedOrigin || location.hash) return false;
    // Private routes and arbitrary query values (including searches) are not sent to Meta.
    const publicPath = location.pathname === '/' || /^\/(produto|oferta)\/[a-f0-9-]{36}$/.test(location.pathname);
    const attribution = new Set(['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
    return publicPath && [...new URLSearchParams(location.search).keys()].every(key => attribution.has(key));
  }
  private allowed() { return this.available() && this.consent() === true && this.publicPage(); }
  private load() {
    if (this.script || !this.allowed()) return;
    const window = this.window!;
    const queue: PixelFunction = Object.assign((...args: unknown[]) => {
      if (queue.callMethod) queue.callMethod(...args); else queue.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: '2.0' });
    queue.push = queue;
    window.fbq = queue; window._fbq = queue;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.referrerPolicy = 'strict-origin';
    script.onload = () => { this.ready = true; this.visit(); };
    script.onerror = () => { script.remove(); this.script = undefined; };
    this.script = script;
    this.document.head.appendChild(script);
  }
  private visit() {
    if (!this.allowed()) { this.page = ''; this.contentSent = ''; return; }
    if (!this.ready) { this.load(); return; }
    const fbq = this.window!.fbq!;
    fbq('consent', 'grant');
    if (!this.initialized) {
      fbq('set', 'autoConfig', false, this.config!.pixelId);
      fbq('init', this.config!.pixelId);
      this.initialized = true;
    }
    const path = this.window!.location.pathname;
    if (this.page !== path) {
      this.page = path; this.contentSent = '';
      this.event('PageView');
    }
    this.sendContent();
  }
  viewContent(kind: 'product' | 'offer', id: string) {
    if (!this.browser) return;
    this.content = { kind, id, path: this.window!.location.pathname };
    this.sendContent();
  }
  private sendContent() {
    const content = this.content;
    if (!content || content.path !== this.window?.location.pathname || this.contentSent === content.path) return;
    if (this.event('ViewContent', { content_ids: [content.id], content_type: 'product', catalog_kind: content.kind })) this.contentSent = content.path;
  }
  favorite(id: string) { this.event('AddToWishlist', { content_ids: [id], content_type: 'product' }); }
  affiliateClick(id: string) { this.event('AffiliateClick', { offer_id: id }, true); }
  private event(name: string, data: Record<string, unknown> = {}, custom = false) {
    if (!this.allowed() || !this.ready || !this.initialized) return false;
    this.window?.fbq?.(custom ? 'trackSingleCustom' : 'trackSingle', this.config!.pixelId, name, data);
    return true;
  }
}
