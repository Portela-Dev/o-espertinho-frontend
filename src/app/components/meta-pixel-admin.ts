import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../api.service';
interface Settings { enabled: boolean; pixelId: string; version: number }
@Component({
  selector: 'meta-pixel-admin', imports: [FormsModule],
  styles: `.pixel-form{display:grid;gap:18px;max-width:600px}.pixel-form button{justify-self:start}.pixel-form label{display:grid;gap:8px}.pixel-form .checkbox-label{display:flex;gap:10px;align-items:center}`,
  template: `<section class="panel">
    @if(settings(); as value){
      <form class="pixel-form" (ngSubmit)="save()">
        <label class="checkbox-label"><input type="checkbox" [(ngModel)]="value.enabled" name="enabled" [disabled]="busy()"/>Habilitar Pixel Meta</label>
        <label for="meta-pixel-id">Identificação do pixel</label>
        <input id="meta-pixel-id" name="pixelId" [(ngModel)]="value.pixelId" inputmode="numeric" pattern="[0-9]{5,30}" required maxlength="30" [disabled]="busy()"/>
        <p class="muted">Funciona no domínio de produção, após o aceite dos cookies opcionais. Registra visitas públicas, visualização de produto/oferta, favoritos e cliques para lojas. Não registra compras nem envia dados da conta.</p>
        <button class="button dark" type="submit" [disabled]="busy()">Salvar configurações</button>
      </form>
    }@else{<output aria-live="polite">Carregando Pixel Meta…</output>}
  </section>`,
})
export class MetaPixelAdmin implements OnInit {
  readonly api = inject(Api);
  readonly busy = signal(false);
  readonly settings = signal<Settings | null>(null);
  async ngOnInit() { try { this.settings.set(await this.api.get<Settings>('/admin/marketing')); } catch(error) { this.api.fail(error); } }
  async save() {
    const settings = this.settings();
    if (!settings || this.busy()) return;
    this.busy.set(true);
    try {
      this.settings.set(await this.api.send<Settings>('PUT', '/admin/marketing', settings));
      this.api.success('Configurações do Pixel Meta salvas.');
    } catch(error) { this.api.fail(error); } finally { this.busy.set(false); }
  }
}
