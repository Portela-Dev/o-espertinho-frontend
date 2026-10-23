import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Api} from '../api.service';
import {Sharing,SharingSettings,SharingChannel} from '../sharing';
import {SocialLogo} from './social-logo';
import {ActionMenu} from './action-menu';
import {Pagination} from './pagination';
import {DismissOnBackdrop} from './dismiss-on-backdrop';
@Component({selector:'sharing-admin',imports:[FormsModule,SocialLogo,ActionMenu,Pagination,DismissOnBackdrop],styles:`.sharing-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}.sharing-network{display:flex;align-items:center;gap:9px}.sharing-template{white-space:pre-wrap;overflow-wrap:anywhere;max-width:440px}.sharing-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}`,template:`
@if(loading()){<p role="status">Carregando compartilhamento…</p>}@else if(settings){
<section class="panel"><div class="sharing-toolbar"><label class="checkbox-label"><input type="checkbox" [(ngModel)]="settings.enabled" [disabled]="busy()"> Habilitar compartilhamento de ofertas</label><button type="button" class="button dark" [disabled]="busy()" (click)="save()">Salvar configurações</button></div>
<p class="muted">Os links levam à página da oferta no Espertinho. Variáveis do texto: <code>{{variables}}</code>. No endereço de compartilhamento, também é possível usar <code>{{textVariable}}</code>; os valores são codificados automaticamente.</p>
<div class="section-heading"><h2>Redes sociais</h2><button type="button" class="button outline" [disabled]="busy()||settings.channels.length>=20" (click)="edit()">Adicionar rede</button></div>
<div class="table-wrap"><table><thead><tr><th>Rede</th><th>Status</th><th>Texto padrão</th><th>Ações</th></tr></thead><tbody>@for(channel of settings.channels.slice((page-1)*size,page*size);track channel.id){<tr><td><div class="sharing-network"><social-logo [url]="channel.logoUrl" [name]="channel.name"/><strong>{{channel.name}}</strong></div></td><td>{{channel.enabled?'Ativa':'Desativada'}}</td><td class="sharing-template">{{channel.textTemplate}}</td><td><app-action-menu [menuId]="'sharing-'+channel.id" [label]="'Ações de '+channel.name"><button type="button" [disabled]="busy()" (click)="edit(channel)">Editar</button><button type="button" [disabled]="busy()" (click)="toggle(channel)">{{channel.enabled?'Desativar':'Ativar'}}</button><button type="button" class="danger-text" [disabled]="busy()" (click)="remove(channel)">Remover</button></app-action-menu></td></tr>}</tbody></table></div>
<app-pagination [page]="page" [total]="settings.channels.length" [size]="size" (pageChange)="page=$event" (sizeChange)="size=$event;page=1" label="Redes sociais"/>
</section>
}@else{<p role="alert">Não foi possível carregar as configurações.</p><button type="button" class="button outline" (click)="load()">Tentar novamente</button>}
@if(draft;as d){<div class="modal-backdrop" (dismissOnBackdrop)="!busy()&&close()"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="sharing-edit-title"><button type="button" class="close-button" aria-label="Fechar" [disabled]="busy()" (click)="close()">×</button><h2 id="sharing-edit-title">{{editing?'Editar rede':'Adicionar rede'}}</h2><form (ngSubmit)="saveDraft()"><fieldset [disabled]="busy()" style="border:0;padding:0;margin:0">
<label>Identificador<input name="id" [(ngModel)]="d.id" required pattern="[a-z][a-z0-9-]{0,39}" maxlength="40" [readonly]="!!editing"></label>
<label>Nome da rede<input name="name" [(ngModel)]="d.name" required maxlength="60"></label>
<label>Logo<input name="logo" [(ngModel)]="d.logoUrl" required maxlength="2000" placeholder="https://... ou /brand/social/whatsapp.svg"></label>
<label>Forma de compartilhamento<select name="action" [(ngModel)]="d.action"><option value="url">Abrir página da rede</option><option value="copy">Copiar texto e link</option></select></label>
@if(d.action==='url'){<label>Endereço de compartilhamento<input name="urlTemplate" [(ngModel)]="d.urlTemplate" required maxlength="2000"></label>}
<label>Texto padrão<textarea name="text" [(ngModel)]="d.textTemplate" rows="5" required maxlength="3000"></textarea></label>
<label class="checkbox-label"><input type="checkbox" name="enabled" [(ngModel)]="d.enabled"> Rede ativa</label>
<div class="sharing-actions"><button type="button" class="button outline" (click)="close()">Cancelar</button><button type="submit" class="button dark">{{busy()?'Salvando…':'Salvar rede'}}</button></div></fieldset></form></section></div>}
`})
export class SharingAdmin implements OnInit{
 api=inject(Api);sharing=inject(Sharing);settings:SharingSettings|null=null;draft:SharingChannel|null=null;editing='';loading=signal(true);busy=signal(false);page=1;size=10;variables='{titulo}, {preco}, {loja}, {url}';textVariable='{texto}';
 ngOnInit(){void this.load();}
 async load(){this.loading.set(true);try{this.settings=await this.api.get<SharingSettings>('/admin/sharing');}catch(e){this.api.fail(e);}finally{this.loading.set(false);}}
 edit(channel?:SharingChannel){this.editing=channel?.id||'';this.draft=channel?{...channel}:{id:'',name:'',enabled:true,logoUrl:'/brand/social/whatsapp.svg',action:'url',urlTemplate:'',textTemplate:'Confira {titulo} por {preco} na {loja}: {url}'};}
 close(){this.draft=null;this.editing='';}
 async save(){if(!this.settings||this.busy())return false;this.busy.set(true);try{this.settings=await this.api.send<SharingSettings>('PUT','/admin/sharing',this.settings);this.sharing.invalidate();this.api.success('Configurações de compartilhamento salvas.');return true;}catch(e){this.api.fail(e);return false;}finally{this.busy.set(false);}}
 async saveDraft(){if(!this.settings||!this.draft)return;const draft={...this.draft},previous=[...this.settings.channels];if(!this.editing&&previous.some(c=>c.id===draft.id)){this.api.fail(new Error('Identificador já cadastrado.'));return;}this.settings.channels=this.editing?previous.map(c=>c.id===this.editing?draft:c):[...previous,draft];if(await this.save())this.close();else this.settings.channels=previous;}
 async toggle(channel:SharingChannel){if(!this.settings)return;const previous=this.settings.channels;this.settings.channels=previous.map(c=>c.id===channel.id?{...c,enabled:!c.enabled}:c);if(!await this.save())this.settings.channels=previous;}
 async remove(channel:SharingChannel){if(!this.settings)return;const previous=this.settings.channels;this.settings.channels=previous.filter(c=>c.id!==channel.id);if(!await this.save())this.settings.channels=previous;this.page=Math.min(this.page,Math.max(1,Math.ceil(this.settings.channels.length/this.size)));}
}
