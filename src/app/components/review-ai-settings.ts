import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';
@Component({selector:'review-ai-settings',imports:[FormsModule],template:`
<h3>IA na revisão de ofertas</h3><p>As tarefas são independentes. A extensão usa a conta ChatGPT conectada no painel e aplica automaticamente decisões válidas de catálogo e categoria. Casos ambíguos ficam pendentes; a publicação é sempre manual.</p>
@if(loading()){<p role="status">Carregando configurações…</p>}@else if(settings){
<form (ngSubmit)="save()"><fieldset [disabled]="busy()" style="border:0;padding:0">
<label class="checkbox-label"><input type="checkbox" name="categoryEnabled" [(ngModel)]="settings.categoryEnabled"> Ativar categorização por IA</label>
<label>Instruções de categorização<textarea name="categoryPrompt" rows="6" required maxlength="10000" [(ngModel)]="settings.categoryPrompt"></textarea></label>
<label class="checkbox-label"><input type="checkbox" name="productEnabled" [(ngModel)]="settings.productEnabled"> Ativar classificação de produto por IA</label>
<label>Instruções para vincular ou criar produtos<textarea name="productPrompt" rows="6" required maxlength="10000" [(ngModel)]="settings.productPrompt"></textarea></label>
<p class="muted">O passo 4 busca produtos globalmente e prepara rascunhos de novas identidades. O passo 5 categoriza os rascunhos e cria os produtos definitivos. Os prompts complementam as regras de segurança, os limites do cadastro e o formato da resposta. Alterar o prompt ou a ativação de uma tarefa invalida apenas as sugestões antigas dessa tarefa.</p>
<div class="actions"><button type="button" class="button outline" (click)="load()">Recarregar</button><button type="submit" class="button dark" [disabled]="!settings.categoryPrompt.trim()||!settings.productPrompt.trim()">{{busy()?'Salvando…':'Salvar configurações de IA'}}</button></div></fieldset></form>
}@else{<p role="alert">Não foi possível carregar as configurações.</p><button class="button outline" (click)="load()">Tentar novamente</button>}
`})
export class ReviewAiSettings implements OnInit{
 api=inject(Api);settings:any;loading=signal(true);busy=signal(false);
 ngOnInit(){void this.load();}
 async load(){this.loading.set(true);try{this.settings=await this.api.get('/admin/discovery/enrichment/ai/settings');}catch(e){this.api.fail(e);}finally{this.loading.set(false);}}
 async save(){if(this.busy())return;this.busy.set(true);try{this.settings=await this.api.send('PUT','/admin/discovery/enrichment/ai/settings',this.settings);this.api.success('Configurações de IA salvas. Atualize as configurações na extensão.');}catch(e){this.api.fail(e);}finally{this.busy.set(false);}}
}
