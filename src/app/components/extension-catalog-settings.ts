import {Component,Input,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';

@Component({selector:'extension-catalog-settings',standalone:true,imports:[FormsModule],template:`
<details class="panel" (toggle)="opened($event)"><summary>Execução pela extensão / conversão e bloqueios</summary>
@if(loaded()){
<p class="muted">Configuração declarativa usada pelos quatro passos. Cookies e tokens do marketplace permanecem no Chrome.</p>
<label>Executor<select [(ngModel)]="executor"><option value="legacy">Serviços atuais (durante a migração)</option><option value="extension">Extensão do Chrome — execução manual</option></select></label>
<div class="form-grid"><label>Intervalo entre consultas (ms)<input type="number" min="100" max="600000" [(ngModel)]="config.intervalMs"></label>
<label>Tempo máximo por página (ms)<input type="number" min="1000" max="120000" [(ngModel)]="config.timeoutMs"></label>
<label>Prazo para intervenção humana (ms)<input type="number" min="60000" max="3600000" [(ngModel)]="config.humanTimeoutMs"></label>
<label>Separador da categoria de origem (opcional)<input maxlength="10" [(ngModel)]="config.categorySeparator"></label></div>
<h3>Detecção de estados</h3><p class="legal-small">Regras são avaliadas antes da extração. Login, desafio, acesso negado e limite de chamadas pausam a execução. Indisponibilidade precisa de indicador explícito.</p>
@for(rule of config.blockRules;track $index){<div class="form-grid"><label>Estado<select [(ngModel)]="rule.kind"><option value="login">Login necessário</option><option value="challenge">CAPTCHA / desafio humano</option><option value="access_denied">Acesso negado</option><option value="rate_limit">Limite de consultas</option><option value="unavailable">Produto indisponível</option></select></label>
<label>Identificar por<select [(ngModel)]="rule.match"><option value="selector">Seletor CSS presente</option><option value="url_contains">Trecho da URL</option><option value="text">Texto presente na página</option></select></label>
<label>Valor<input maxlength="600" [(ngModel)]="rule.value"></label><button type="button" class="text-button" (click)="config.blockRules.splice($index,1)">Remover regra</button></div>}
<button type="button" class="button outline small" (click)="config.blockRules.push({kind:'login',match:'selector',value:''})">Adicionar regra</button>
<h3>Receita de conversão (opcional)</h3><p class="legal-small">JSON declarativo: id do marketplace, name, loginUrl, allowedOrigins, affiliateOrigins, batchSize, intervalMs e steps. Operações: extract, request, fill e click. Requests GET/POST na mesma origem; responsePath identifica o campo do link. Variáveis usam duas chaves, como <code>{{placeholder}}</code>. Deixe vazio se ainda não houver receita. Não informe cookies ou tokens fixos.</p>
<label>Receita JSON (opcional)<textarea rows="12" [(ngModel)]="recipeText" spellcheck="false"></textarea></label>
<button type="button" class="button dark small" [disabled]="busy()" (click)="save()">Salvar configuração da extensão</button>
}@else{<p>Configuração ainda não carregada.</p><button type="button" class="button outline small" (click)="load()">Carregar</button>}
</details>`})
export class ExtensionCatalogSettings {
 @Input({required:true}) marketplaceId='';
 api=inject(Api);loaded=signal(false);busy=signal(false);executor='legacy';version=0;recipeText='';placeholder='{{originalUrl}}';
 config:any={intervalMs:2000,timeoutMs:30000,humanTimeoutMs:900000,categorySeparator:'>',blockRules:[],recipe:null};
 opened(event:Event){if((event.target as HTMLDetailsElement).open&&!this.loaded())void this.load();}
 async load(){try{const data=await this.api.get<any>('/admin/extension-catalog/settings/'+this.marketplaceId);this.config=data.config;this.executor=data.catalog_executor;this.version=data.version;this.recipeText=data.config.recipe?JSON.stringify(data.config.recipe,null,2):'';this.loaded.set(true);}catch(e){this.api.fail(e);}}
 async save(){if(this.busy())return;this.busy.set(true);try{const recipe=this.recipeText.trim()?JSON.parse(this.recipeText):null;const result=await this.api.send<any>('PUT','/admin/extension-catalog/settings/'+this.marketplaceId,{version:this.version,executor:this.executor,config:{...this.config,recipe}});this.version=result.version;this.api.success('Configuração salva. Será aplicada às próximas execuções.');}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
}
