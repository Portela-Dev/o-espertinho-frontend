import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../api.service';
import { DismissOnBackdrop } from './dismiss-on-backdrop';

interface Criteria {
  links: boolean;
  products: boolean;
  linksDays: number;
  productsDays: number;
}
interface PurgePreview {
  previewToken: string;
  criteria: Criteria;
  asOf: string;
  expiresAt: string;
  counts: Record<string, number>;
}
@Component({
  selector: 'catalog-purge',
  imports: [FormsModule, DatePipe, DismissOnBackdrop],
  template: `
    <section class="panel">
      <h2>Expurgo de ofertas e produtos</h2>
      <p>
        Exclusão física dos registros elegíveis e de suas dependências. A
        operação é manual e não pode ser desfeita.
      </p>
      <form (ngSubmit)="inspect()">
        <fieldset [disabled]="busy()">
          <div class="form-grid">
            <div>
              <label class="checkbox-label"
                ><input
                  type="checkbox"
                  name="links"
                  [(ngModel)]="criteria.links"
                  (ngModelChange)="resetPreview()"
                />
                Expurgar links</label
              >
              <label
                >Período dos links (dias)<input
                  type="number"
                  name="linksDays"
                  min="1"
                  max="3650"
                  step="1"
                  required
                  [(ngModel)]="criteria.linksDays"
                  (ngModelChange)="resetPreview()"
                  [disabled]="!criteria.links"
              /></label>
              <p class="muted">
                Ofertas indisponíveis no marketplace ou com falhas técnicas
                persistentes. Inclui links descobertos com extração em falha ou
                indisponibilidade confirmada.
              </p>
            </div>
            <div>
              <label class="checkbox-label"
                ><input
                  type="checkbox"
                  name="products"
                  [(ngModel)]="criteria.products"
                  (ngModelChange)="resetPreview()"
                />
                Expurgar produtos</label
              >
              <label
                >Período dos produtos (dias)<input
                  type="number"
                  name="productsDays"
                  min="1"
                  max="3650"
                  step="1"
                  required
                  [(ngModel)]="criteria.productsDays"
                  (ngModelChange)="resetPreview()"
                  [disabled]="!criteria.products"
              /></label>
              <p class="muted">
                Produtos sem nenhuma oferta cadastrada durante todo o período,
                incluindo suas revisões e prévias dependentes.
              </p>
            </div>
          </div>
          <p class="muted">
            Tentativas repetidas não reiniciam a contagem. Para produtos já sem
            ofertas sem histórico suficiente, a contagem começa na ativação
            deste recurso. Remover a última oferta inicia uma nova contagem para
            o produto.
          </p>
          <button type="submit" class="button outline" [disabled]="!valid()">
            {{ busy() ? 'Consultando…' : 'Calcular prévia do expurgo' }}
          </button>
        </fieldset>
      </form>
    </section>
    @if (preview(); as p) {
      <section class="panel" aria-labelledby="purge-preview">
        <h2 id="purge-preview">Prévia da exclusão</h2>
        <p>
          Calculada em {{ p.asOf | date: 'dd/MM/yyyy HH:mm:ss' }}. Válida até
          {{ p.expiresAt | date: 'HH:mm:ss' }}.
        </p>
        <div class="stats-grid">
          <article class="stat-card">
            <span>Ofertas cadastradas</span
            ><strong>{{ p.counts['offers'] }}</strong>
          </article>
          <article class="stat-card">
            <span>Links descobertos e dependentes</span
            ><strong>{{ p.counts['discoveredLinks'] }}</strong>
          </article>
          <article class="stat-card">
            <span>Produtos sem ofertas</span
            ><strong>{{ p.counts['products'] }}</strong>
          </article>
        </div>
        <p>
          Também serão removidos {{ p.counts['priceHistory'] }} registros de
          preços, {{ p.counts['favorites'] }} favoritos,
          {{ p.counts['collectionItems'] }} itens de coleções,
          {{ p.counts['clicks'] }} cliques,
          {{ p.counts['productDrafts'] }} rascunhos e
          {{ p.counts['previews'] }} prévias, além das sugestões e registros de
          processamento relacionados.
        </p>
        <p class="muted">
          Usuários, coleções, categorias, marketplaces, configurações e URLs de
          vitrines são preservados. Execuções compartilhadas mantêm os itens de
          outros registros.
        </p>
        <button
          type="button"
          class="button danger"
          [disabled]="busy() || !hasRecords(p)"
          (click)="confirming.set(true)"
        >
          Revisar e excluir definitivamente
        </button>
        @if (!hasRecords(p)) {
          <p>Nenhum registro elegível para estes períodos.</p>
        }
      </section>
    }
    @if (result(); as r) {
      <output aria-live="polite" class="info-box"
        >Expurgo concluído: {{ r['offers'] }} ofertas,
        {{ r['discoveredLinks'] }} links descobertos e
        {{ r['products'] }} produtos excluídos fisicamente, com suas
        dependências.</output
      >
    }
    @if (confirming() && preview(); as p) {
      <div
        class="modal-backdrop"
        (dismissOnBackdrop)="!busy() && closeConfirmation()"
      >
        <section
          class="modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="purge-confirm"
        >
          <h2 id="purge-confirm">Excluir definitivamente?</h2>
          <p>
            Serão excluídos {{ p.counts['offers'] }} ofertas,
            {{ p.counts['discoveredLinks'] }} links descobertos,
            {{ p.counts['products'] }} produtos e suas dependências.
          </p>
          <label class="checkbox-label"
            ><input
              type="checkbox"
              [(ngModel)]="confirmed"
              [disabled]="busy()"
            />
            Confirmo a exclusão física e irreversível dos registros desta
            prévia.</label
          >
          <div class="button-row">
            <button
              type="button"
              class="button outline"
              [disabled]="busy()"
              (click)="closeConfirmation()"
            >
              Cancelar</button
            ><button
              type="button"
              class="button danger"
              [disabled]="busy() || !confirmed"
              (click)="execute()"
            >
              {{ busy() ? 'Excluindo…' : 'Confirmar expurgo' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    fieldset {
      border: 0;
      padding: 0;
      min-width: 0;
    }
    .panel {
      margin-bottom: 24px;
    }
    .checkbox-label {
      margin-bottom: 16px;
    }
    .form-grid p {
      font-size: 13px;
      line-height: 1.6;
    }
    .form-grid input[type='number'] {
      max-width: 240px;
    }
    .button-row {
      margin-top: 20px;
    }
  `,
})
export class CatalogPurge {
  api = inject(Api);
  criteria: Criteria = {
    links: true,
    products: true,
    linksDays: 30,
    productsDays: 30,
  };
  busy = signal(false);
  preview = signal<PurgePreview | null>(null);
  result = signal<Record<string, number> | null>(null);
  confirming = signal(false);
  confirmed = false;
  valid() {
    return (
      (this.criteria.links || this.criteria.products) &&
      [this.criteria.linksDays, this.criteria.productsDays].every(
        (n) => Number.isInteger(n) && n >= 1 && n <= 3650,
      )
    );
  }
  hasRecords(p: PurgePreview) {
    return (
      p.counts['offers'] + p.counts['discoveredLinks'] + p.counts['products'] >
      0
    );
  }
  resetPreview() {
    this.preview.set(null);
    this.result.set(null);
    this.closeConfirmation();
  }
  closeConfirmation() {
    this.confirming.set(false);
    this.confirmed = false;
  }
  async inspect() {
    if (this.busy() || !this.valid()) return;
    this.resetPreview();
    this.busy.set(true);
    try {
      this.preview.set(
        await this.api.send<PurgePreview>('POST', '/admin/purge/preview', {
          ...this.criteria,
        }),
      );
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  async execute() {
    const p = this.preview();
    if (this.busy() || !p || !this.confirmed) return;
    this.busy.set(true);
    try {
      const result = await this.api.send<{ counts: Record<string, number> }>(
        'POST',
        '/admin/purge/execute',
        { previewToken: p.previewToken, confirmed: true },
      );
      this.result.set(result.counts);
      this.preview.set(null);
      this.api.success('Expurgo concluído.');
    } catch (e) {
      this.preview.set(null);
      this.api.fail(e);
    } finally {
      this.closeConfirmation();
      this.busy.set(false);
    }
  }
}
