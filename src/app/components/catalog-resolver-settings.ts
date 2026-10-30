import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../api.service';
import { Pagination } from './pagination';
import { ActionMenu } from './action-menu';
@Component({
  selector: 'catalog-resolver-settings',
  imports: [FormsModule, DatePipe, Pagination, ActionMenu],
  styles: `
    :host {
      display: block;
      margin-top: 32px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0;
    }
    fieldset {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 12px;
    }
    .attribute {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      border-bottom: 1px solid var(--line);
      padding: 12px 0;
    }
    td {
      vertical-align: top;
    }
    .reason {
      max-width: 440px;
      overflow-wrap: anywhere;
    }
  `,
  template: `
    <h3>Resolução estruturada do catálogo</h3>
    <button class="button outline small" (click)="load()">
      Recarregar configuração de resolução
    </button>
    <p>
      Regras por tipo de produto, reutilização de identidades e IA somente
      quando necessária. A simulação registra decisões sem alterar ofertas,
      produtos ou categorias. A preparação grava apenas índices de identidade. A
      publicação permanece manual.
    </p>
    @if (settings) {
      <form (ngSubmit)="saveSettings()">
        <fieldset [disabled]="busy()">
          <legend>Modo de operação</legend>
          <label
            >Modo<select name="resolverMode" [(ngModel)]="settings.mode">
              <option value="legacy">Fluxo anterior</option>
              <option value="shadow">
                Simulação (recomendado antes de ativar)
              </option>
              <option value="active">
                Ativo — aplicar decisões válidas automaticamente
              </option>
            </select></label
          >
          <label
            >Tentativas técnicas máximas<input
              name="attempts"
              type="number"
              min="1"
              max="5"
              [(ngModel)]="settings.max_attempts"
          /></label>
          <label
            >Análises simultâneas<select
              name="concurrency"
              [(ngModel)]="settings.concurrency"
            >
              <option [ngValue]="1">1 (conservador)</option>
              <option [ngValue]="2">2</option>
            </select></label
          >
          <button class="button dark" type="submit">
            Salvar modo de operação
          </button>
        </fieldset>
      </form>
    }
    <details>
      <summary>Políticas de identidade por tipo</summary>
      <p>
        Cadastre os tipos atendidos e os atributos obrigatórios que distinguem
        produtos. Tipos sem política ou evidências insuficientes são excluídos
        automaticamente, com motivo. Nomes de modelo, RAM física, armazenamento
        e tela podem distinguir; cor, tensão e tamanho de roupa isoladamente não
        devem distinguir. Use prioridade maior para acessórios e kits, evitando
        confundir compatibilidade com o produto principal.
      </p>
      <label
        >Política<select
          [ngModel]="selectedPolicy"
          (ngModelChange)="selectPolicy($event)"
        >
          <option value="">Nova política</option>
          @for (p of policies; track p.id) {
            <option [value]="p.id">
              {{ p.definition.name }}{{ p.enabled ? '' : ' (desativada)' }}
            </option>
          }
        </select></label
      >
      <form (ngSubmit)="savePolicy()">
        <fieldset [disabled]="busy()">
          <legend>
            {{ selectedPolicy ? 'Editar política' : 'Nova política' }}
          </legend>
          <label
            >Identificador<input
              name="policyId"
              required
              pattern="[a-z][a-z0-9_-]{1,39}"
              [(ngModel)]="policyId"
              [disabled]="!!selectedPolicy"
          /></label>
          <label
            >Nome<input
              name="policyName"
              required
              maxlength="100"
              [(ngModel)]="definition.name"
          /></label>
          <label
            >Termos no título (separados por vírgula)<input
              name="terms"
              required
              [(ngModel)]="terms"
          /></label>
          <label
            >Prioridade<input
              name="priority"
              type="number"
              min="0"
              max="100"
              [(ngModel)]="definition.priority"
          /></label>
          <label
            >Categoria padrão (opcional)<input
              name="categorySearch"
              placeholder="Pesquisar categoria"
              [(ngModel)]="categorySearch"
              (ngModelChange)="searchCategories()" /></label
          ><label
            >Usar categoria já cadastrada<select
              name="defaultCategory"
              [(ngModel)]="definition.categoryId"
            >
              <option [ngValue]="null">IA decide a categoria</option>
              @for (c of categories; track c.id) {
                <option [value]="c.id">{{ c.path.join(' › ') }}</option>
              }
            </select></label
          >
          <label class="checkbox-label"
            ><input
              name="exclusive"
              type="checkbox"
              [(ngModel)]="definition.exclusive"
            />Identidade exclusiva por anúncio (kits personalizados)</label
          >
          <label class="checkbox-label"
            ><input
              name="policyEnabled"
              type="checkbox"
              [(ngModel)]="policyEnabled"
            />Política ativada</label
          >
          @for (a of definition.attributes; track $index; let i = $index) {
            <div class="attribute">
              <label
                >Chave<input
                  [name]="'key' + i"
                  required
                  [(ngModel)]="a.key" /></label
              ><label
                >Nome do atributo<input
                  [name]="'label' + i"
                  required
                  [(ngModel)]="a.label"
              /></label>
              <label
                >Nomes equivalentes na ficha<input
                  [name]="'aliases' + i"
                  [ngModel]="a.aliases.join(', ')"
                  (ngModelChange)="a.aliases = split($event)"
              /></label>
              <label
                >Unidade<select [name]="'unit' + i" [(ngModel)]="a.unit">
                  <option value="text">Texto</option>
                  <option value="gb">GB (normaliza MB/TB)</option>
                  <option value="inch">Polegadas</option>
                  <option value="number">Número</option>
                </select></label
              >
              <label
                >Valores equivalentes (opcional, alias=valor por vírgula)<input
                  [name]="'values' + i"
                  [ngModel]="aliasesText(a.values)"
                  (ngModelChange)="a.values = parseAliases($event)"
              /></label>
              <label class="checkbox-label"
                ><input
                  type="checkbox"
                  [name]="'required' + i"
                  [(ngModel)]="a.required"
                />Obrigatório para identidade</label
              >
              <button
                type="button"
                class="button outline small"
                (click)="definition.attributes.splice(i, 1)"
              >
                Remover atributo
              </button>
            </div>
          }
          <div class="actions">
            <button
              class="button outline"
              type="button"
              (click)="addAttribute()"
            >
              Adicionar atributo</button
            ><button class="button dark" type="submit">Salvar política</button>
          </div>
        </fieldset>
      </form>
    </details>
    <div class="actions">
      <button class="button outline" [disabled]="busy()" (click)="prepare()">
        Preparar índices dos produtos existentes</button
      ><button class="button outline" (click)="loadRuns()">
        Atualizar execuções
      </button>
    </div>
    <h4>Execuções</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Início</th>
            <th>Marketplace / tarefa</th>
            <th>Modo</th>
            <th>Status</th>
            <th>Links</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (r of runs.items; track r.id) {
            <tr>
              <td>{{ r.created_at | date: 'short' }}</td>
              <td>
                {{ r.marketplace_id }} ·
                {{ r.task === 'product' ? 'Catalogar' : 'Categorizar' }}
              </td>
              <td>{{ r.mode === 'shadow' ? 'Simulação' : 'Ativo' }}</td>
              <td>{{ r.status }}</td>
              <td>{{ r.total }}</td>
              <td>
                <app-action-menu [menuId]="'resolver-' + r.id"
                  ><button (click)="openRun(r)">Detalhar resultados</button>
                  @if (r.status === 'running') {
                    <button (click)="action(r, 'pause')">Pausar</button>
                  }
                  @if (r.status === 'paused') {
                    <button (click)="action(r, 'resume')">
                      Permitir retomada na extensão
                    </button>
                  }
                  @if (r.status === 'running' || r.status === 'paused') {
                    <button (click)="action(r, 'cancel')">Cancelar</button>
                  }
                </app-action-menu>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-pagination
      [page]="runs.page"
      [size]="runs.pageSize"
      [total]="runs.total"
      (pageChange)="runPage = $event; loadRuns()"
      (sizeChange)="runSize = $event; runPage = 1; loadRuns()"
    />
    @if (current) {
      <h4>Resultados da execução</h4>
      <p>
        Amostra avaliada: {{ current.stats?.evaluated || 0 }} · vínculos
        incorretos: {{ current.stats?.false_merges || 0 }} · duplicatas:
        {{ current.stats?.duplicates || 0 }} · categorias incorretas:
        {{ current.stats?.wrong_categories || 0 }} · exclusões indevidas:
        {{ current.stats?.excluded_valid || 0 }}
      </p>
      <p>
        {{ current.stats?.accepted || 0 }} aceitos ·
        {{ current.stats?.excluded || 0 }} excluídos ·
        {{ current.stats?.failed || 0 }} falhas técnicas ·
        {{ current.stats?.calls || 0 }} chamadas de IA ·
        {{ current.stats?.tokens || 0 }} tokens informados ·
        {{ current.stats?.prepared || 0 }} produtos existentes preparados
      </p>
      <label
        >Resultado<select
          [(ngModel)]="status"
          (ngModelChange)="itemPage = 1; loadItems()"
        >
          <option value="">Todos</option>
          <option value="accepted">Aceitos</option>
          <option value="excluded">Excluídos</option>
          <option value="failed">Falhas técnicas</option>
          <option value="queued">Aguardando</option>
          <option value="leased">Em processamento</option>
        </select></label
      >
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
              <th>Decisão / motivo</th>
              <th>Chamadas / tempo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (i of items.items; track i.id) {
              <tr>
                <td>{{ i.title || 'Preparação de produto existente' }}</td>
                <td>{{ i.status }}</td>
                <td class="reason">
                  {{ i.decision?.outcome }} {{ i.decision?.reason }}
                </td>
                <td>{{ i.calls }} / {{ i.elapsed_ms }} ms</td>
                <td>
                  <app-action-menu
                    [menuId]="'evaluation-' + i.id"
                    label="Avaliar resultado"
                    ><button (click)="evaluate(i, 'correct')">
                      Decisão correta</button
                    ><button (click)="evaluate(i, 'false_merge')">
                      Vínculo incorreto</button
                    ><button (click)="evaluate(i, 'duplicate')">
                      Produto duplicado</button
                    ><button (click)="evaluate(i, 'wrong_category')">
                      Categoria incorreta</button
                    ><button (click)="evaluate(i, 'excluded_valid')">
                      Exclusão indevida
                    </button></app-action-menu
                  >
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination
        [page]="items.page"
        [size]="items.pageSize"
        [total]="items.total"
        (pageChange)="itemPage = $event; loadItems()"
        (sizeChange)="itemSize = $event; itemPage = 1; loadItems()"
      />
    }
  `,
})
export class CatalogResolverSettings implements OnInit {
  categorySearch = '';
  categories: any[] = [];
  api = inject(Api);
  cdr = inject(ChangeDetectorRef);
  busy = signal(false);
  base = '/admin/discovery/enrichment/resolver';
  settings: any;
  policies: any[] = [];
  selectedPolicy = '';
  policyId = '';
  policyEnabled = true;
  definition: any = {
    name: '',
    priority: 0,
    exclusive: false,
    categoryId: null,
    attributes: [],
  };
  terms = '';
  runs: any = { items: [], page: 1, pageSize: 10, total: 0 };
  items: any = { items: [], page: 1, pageSize: 10, total: 0 };
  runPage = 1;
  runSize = 10;
  itemPage = 1;
  itemSize = 10;
  current: any;
  status = '';
  ngOnInit() {
    void this.load();
    void this.loadRuns();
  }
  async load() {
    try {
      const r: any = await this.api.get(this.base + '/settings');
      this.settings = r.settings;
      this.policies = r.policies;
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  split(value: string) {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  selectPolicy(id: string) {
    this.selectedPolicy = id;
    const p = this.policies.find((p) => p.id === id);
    this.policyId = id;
    this.policyEnabled = p?.enabled ?? true;
    this.definition = p
      ? structuredClone(p.definition)
      : {
          name: '',
          priority: 0,
          exclusive: false,
          categoryId: null,
          attributes: [],
        };
    this.terms = (this.definition.terms ?? []).join(', ');
    void this.searchCategories();
  }
  aliasesText(v: any) {
    return Object.entries(v ?? {})
      .map(([a, b]) => a + '=' + b)
      .join(', ');
  }
  parseAliases(v: string) {
    return Object.fromEntries(
      this.split(v)
        .map((p) => p.split('='))
        .filter((p) => p.length === 2 && p.every((x) => x.trim()))
        .map((p) => p.map((x) => x.trim())),
    );
  }
  async searchCategories() {
    try {
      const r: any = await this.api.get(
        '/admin/categories?q=' +
          encodeURIComponent(this.categorySearch) +
          '&pageSize=50',
      );
      this.categories = r.items;
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  addAttribute() {
    this.definition.attributes.push({
      key: '',
      label: '',
      aliases: [],
      unit: 'text',
      required: true,
      values: {},
    });
  }
  async saveSettings() {
    await this.mutate(async () => {
      this.settings = await this.api.send('PUT', this.base + '/settings', {
        version: this.settings.version,
        mode: this.settings.mode,
        maxAttempts: this.settings.max_attempts,
        concurrency: this.settings.concurrency,
      });
    });
  }
  async savePolicy() {
    await this.mutate(async () => {
      const p = this.policies.find((p) => p.id === this.selectedPolicy);
      const definition = { ...this.definition };
      delete definition.id;
      delete definition.version;
      await this.api.send(
        'PUT',
        this.base + '/policies/' + encodeURIComponent(this.policyId),
        {
          version: p?.version ?? 0,
          enabled: this.policyEnabled,
          definition: { ...definition, terms: this.split(this.terms) },
        },
      );
      await this.load();
      this.selectPolicy(this.policyId);
    });
  }
  async prepare() {
    await this.mutate(async () => {
      let cursor = null;
      do {
        const r: any = await this.api.send('POST', this.base + '/prepare', {
          cursor,
        });
        cursor = r.nextCursor;
      } while (cursor);
    });
  }
  async mutate(fn: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await fn();
      this.api.success('Configuração atualizada. Atualize a extensão.');
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
      this.busy.set(false);
    }
  }
  async loadRuns() {
    try {
      this.runs = await this.api.get(
        this.base + '/runs?page=' + this.runPage + '&pageSize=' + this.runSize,
      );
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  async openRun(run: any) {
    try {
      this.current = await this.api.get(this.base + '/runs/' + run.id);
      this.itemPage = 1;
      await this.loadItems();
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  async evaluate(item: any, evaluation: string) {
    await this.mutate(async () => {
      await this.api.send(
        'PATCH',
        this.base + '/items/' + item.id + '/evaluation',
        { evaluation },
      );
      await this.openRun(this.current);
    });
  }
  async loadItems() {
    if (!this.current) return;
    try {
      this.items = await this.api.get(
        this.base +
          '/items?runId=' +
          this.current.id +
          '&status=' +
          this.status +
          '&page=' +
          this.itemPage +
          '&pageSize=' +
          this.itemSize,
      );
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  async action(run: any, action: string) {
    await this.mutate(async () => {
      await this.api.send('POST', this.base + '/runs/' + run.id + '/action', {
        action,
      });
      await this.loadRuns();
    });
  }
}
