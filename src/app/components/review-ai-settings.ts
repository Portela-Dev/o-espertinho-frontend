import { Component, OnInit, inject, signal } from '@angular/core';
import { CatalogResolverSettings } from './catalog-resolver-settings';
import { FormsModule } from '@angular/forms';
import { Api } from '../api.service';
@Component({
  selector: 'review-ai-settings',
  imports: [FormsModule, CatalogResolverSettings],
  template: `
    <catalog-resolver-settings />
    <h3>Prompts e habilitação da IA</h3>
    <p>
      As tarefas são independentes. A extensão usa a conta ChatGPT conectada no
      painel e aplica automaticamente decisões válidas de catálogo e categoria.
      No modo estruturado, ambiguidades são excluídas com motivo e falhas
      técnicas têm repetição limitada. O fluxo anterior continua disponível no
      seletor de modo. A publicação é sempre manual.
    </p>
    @if (loading()) {
      <output aria-live="polite">Carregando configurações…</output>
    } @else if (settings) {
      <form (ngSubmit)="save()">
        <fieldset [disabled]="busy()" style="border:0;padding:0">
          <label class="checkbox-label"
            ><input
              type="checkbox"
              name="categoryEnabled"
              [(ngModel)]="settings.categoryEnabled"
            />
            Ativar categorização por IA</label
          >
          <label
            >Instruções de categorização<textarea
              name="categoryPrompt"
              rows="6"
              required
              maxlength="10000"
              [(ngModel)]="settings.categoryPrompt"
            ></textarea>
          </label>
          <label class="checkbox-label"
            ><input
              type="checkbox"
              name="productEnabled"
              [(ngModel)]="settings.productEnabled"
            />
            Ativar classificação de produto por IA</label
          >
          <label
            >Instruções para vincular ou criar produtos<textarea
              name="productPrompt"
              rows="6"
              required
              maxlength="10000"
              [(ngModel)]="settings.productPrompt"
            ></textarea>
          </label>
          <p class="muted">
            O passo 4 busca produtos globalmente e prepara rascunhos de novas
            identidades. O passo 5 categoriza os rascunhos e cria os produtos
            definitivos. Os prompts abaixo são enviados à IA em cada análise,
            junto aos dados e candidatos. Eles complementam as regras de
            segurança, os limites do cadastro e o formato da resposta. Modelo,
            RAM, armazenamento e tela distinguem produtos. Kits personalizados
            têm identidade própria. Alterar o prompt ou a ativação de uma tarefa
            invalida apenas as sugestões antigas dessa tarefa.
          </p>
          <div class="actions">
            <button type="button" class="button outline" (click)="load()">
              Recarregar</button
            ><button
              type="submit"
              class="button dark"
              [disabled]="
                !settings.categoryPrompt.trim() ||
                !settings.productPrompt.trim()
              "
            >
              {{ busy() ? 'Salvando…' : 'Salvar configurações de IA' }}
            </button>
          </div>
        </fieldset>
      </form>
    } @else {
      <p role="alert">Não foi possível carregar as configurações.</p>
      <button class="button outline" (click)="load()">Tentar novamente</button>
    }
  `,
})
export class ReviewAiSettings implements OnInit {
  api = inject(Api);
  settings: any;
  loading = signal(true);
  busy = signal(false);
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    try {
      this.settings = await this.api.get(
        '/admin/discovery/enrichment/ai/settings',
      );
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.loading.set(false);
    }
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      this.settings = await this.api.send(
        'PUT',
        '/admin/discovery/enrichment/ai/settings',
        this.settings,
      );
      this.api.success(
        'Configurações de IA salvas. Atualize as configurações na extensão.',
      );
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
}
