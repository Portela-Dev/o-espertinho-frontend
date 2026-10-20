import {ActionMenu} from './action-menu';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../api.service';
import { PagedData } from '../paged-data';
import { Pagination } from './pagination';
@Component({ selector: 'catalog-operations', standalone: true, imports: [ActionMenu, FormsModule, DatePipe, Pagination], styles: ':host{display:block}', template: `
<section class="panel"><h2>Execuções pela extensão</h2><p>Inicie os quatro passos pelo painel lateral do Chrome. Login e desafios aguardam sua intervenção na janela de processamento. As consultas são iniciadas manualmente pela extensão, sem agendamento automático.</p>
<label>Marketplace<select [(ngModel)]="marketplaceId" (ngModelChange)="runs.reset()"><option value="">Todos</option>@for(m of markets();track m.id){<option [value]="m.id">{{m.name}}</option>}</select></label>
<button class="button outline small" (click)="runs.reset()">Atualizar lista</button>
<div class="table-wrap"><table><thead><tr><th>Marketplace / etapa</th><th>Estado</th><th>Progresso</th><th>Última atividade</th><th>Ações</th></tr></thead><tbody>@for(run of runs.items();track run.id){<tr><td>{{run.marketplace_name}}<small>{{stepLabel(run.step)}}</small></td><td>{{label(run.status)}}<small>{{run.reason}}</small></td><td>{{run.completed}} concluídos / {{run.total}} · {{run.failed}} falhas</td><td>{{run.updated_at|date:'dd/MM/yyyy HH:mm:ss'}}</td><td><app-action-menu [menuId]="'catalog-run-'+run.id"><button  (click)="details(run)">Detalhar</button><button class="danger-text" [disabled]="busy()||['completed','failed','cancelled'].includes(run.status)" (click)="cancel(run)">Cancelar</button></app-action-menu></td></tr>}</tbody></table></div>
<app-pagination [page]="runs.page()||1" [size]="runs.pageSize()" [total]="runs.total()" [busy]="runs.loading()" (pageChange)="runs.go($event)" (sizeChange)="runs.resize($event)" label="Execuções da extensão"/>
@if(runs.failed()){<p role="alert">Não foi possível carregar as execuções.</p>}
@if(selected()){<h3>Itens da execução</h3><code>{{selected().id}}</code><div class="table-wrap"><table><thead><tr><th>Item</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>@for(item of items.items();track item.id){<tr><td>{{item.target_id||item.id}}</td><td>{{label(item.status)}}</td><td>{{item.error}}</td></tr>}</tbody></table></div><app-pagination [page]="items.page()||1" [size]="items.pageSize()" [total]="items.total()" [busy]="items.loading()" (pageChange)="items.go($event)" (sizeChange)="items.resize($event)" label="Itens da execução"/>}
</section>` })
export class CatalogOperations implements OnInit, OnDestroy {
    api = inject(Api);
    marketplaceId = '';
    markets = signal<any[]>([]);
    selected = signal<any>(null);
    busy = signal(false);
    private timer?: ReturnType<typeof setInterval>;
    runs = new PagedData<any>((page, pageSize) => this.api.get('/admin/extension-catalog/runs', { page, pageSize, marketplaceId: this.marketplaceId }));
    items = new PagedData<any>((page, pageSize) => this.api.get('/admin/extension-catalog/runs/' + this.selected().id + '/items', { page, pageSize }));
    async ngOnInit() {
        try {
            this.markets.set(await this.api.get<any[]>('/admin/catalog-marketplaces'));
            await this.runs.reset();
            if (this.api.browser)
                this.timer = setInterval(() => {
                    if (!this.runs.loading() && !this.busy())
                        void this.runs.go(this.runs.page() || 1);
                }, 5000);
        }
        catch (e) {
            this.api.fail(e);
        }
    }
    ngOnDestroy() {
        clearInterval(this.timer);
    }
    label(value: string) {
        return ({ queued: 'Aguardando extensão', running: 'Em execução', waiting_for_human: 'Intervenção necessária', paused_by_user: 'Pausada', paused_technical: 'Pausa técnica', completed: 'Concluído', failed: 'Falha', cancelled: 'Cancelado', pending: 'Pendente', leased: 'Em processamento', skipped: 'Ignorado' } as Record<string, string>)[value] || value;
    }
    stepLabel(value: string) {
        return ({ discover: '1 — Extrair links', convert: '2 — Gerar links de afiliados', enrich: '3 — Extrair informações', prices: '4 — Atualizar preços', preview: 'Prévia manual', selector_test: 'Teste de seletores' } as Record<string, string>)[value] || value;
    }
    async details(run: any) {
        this.selected.set(run);
        await this.items.reset();
    }
    async cancel(run: any) {
        if (this.busy())
            return;
        this.busy.set(true);
        try {
            await this.api.send('POST', '/admin/extension-catalog/runs/' + run.id + '/cancel', {});
            await this.runs.go(this.runs.page() || 1);
        }
        catch (e) {
            this.api.fail(e);
        }
        finally {
            this.busy.set(false);
        }
    }
}
