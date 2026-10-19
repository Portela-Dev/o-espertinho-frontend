import {DismissOnBackdrop} from '../components/dismiss-on-backdrop';
import {PagedData,PageResult} from '../paged-data';
import {InfiniteScroll} from '../components/infinite-scroll';
import {Component,inject,signal,OnInit,DestroyRef,effect,untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink,RouterLinkActive,ActivatedRoute,Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Title} from '@angular/platform-browser';
import {Api} from '../api.service';
import {CategoryNode,Offer,Collection,SavedFilter} from '../models';
import {OfferCard} from '../components/offer-card';
import {UserAvatar} from '../components/user-avatar';
@Component({imports:[DismissOnBackdrop,InfiniteScroll,FormsModule,RouterLink,RouterLinkActive,OfferCard,UserAvatar],template:`
<div class="page-width personal-page"><p class="eyebrow">SEU ESPAÇO</p><div class="section-heading"><div><h1>{{heading()}}</h1><p class="muted">Boas escolhas ficam melhores quando estão organizadas.</p></div>@if(view()==='collections'){<button type="button" class="button dark" (click)="openCreate()">＋ Novo catálogo</button>}</div>
<nav class="tabs" aria-label="Sua conta"><a routerLink="/favoritos" routerLinkActive="selected">♡ Favoritos</a><a routerLink="/catalogos" routerLinkActive="selected">▦ Catálogos</a><a routerLink="/filtros" routerLinkActive="selected">⌕ Filtros salvos</a><a routerLink="/minha-conta" routerLinkActive="selected">Minha conta</a></nav>
@if(loading()&&!feed.items().length){<div class="loading-panel" role="status">Carregando seus achados…</div>}@else if(failed()&&!feed.items().length){<div class="empty-state"><h2>Não foi possível carregar</h2><button class="button dark" (click)="load()">Tentar novamente</button></div>}
@else if(view()==='favorites'){@if(offers().length){<div class="offer-grid personal-grid">@for(o of offers();track o.id){@if(api.favorites().has(o.id)){<offer-card [offer]="o" placement="favorites" />}}</div>}@else{<div class="empty-state"><span class="empty-icon">♡</span><h2>O primeiro favorito é só o começo</h2><p>Toque no coração de uma oferta para encontrá-la aqui.</p><a routerLink="/" class="button dark">Encontrar meus achados ↗</a></div>}}
@else if(view()==='collections'){@if(collections().length){<div class="collection-grid">@for(c of collections();track c.id){<article class="collection-card"><a [routerLink]="['/catalogos',c.id]"><div class="collection-cover"><span>▦</span><span>↗</span></div><h2>{{c.name}}</h2><p>{{c.description||'Um espaço para os seus próximos planos.'}}</p><small>{{c.item_count}} {{c.item_count===1?'oferta guardada':'ofertas guardadas'}} · Privado</small></a><div class="collection-actions"><button class="text-button" (click)="edit(c)">Editar</button><button class="text-button danger-text" (click)="confirmDelete('collection',c.id,c.name)">Excluir</button></div></article>}</div>}@else{<div class="empty-state"><span class="empty-icon">▦</span><h2>Um catálogo para cada plano</h2><p>Seu escritório, a próxima viagem ou os presentes do ano. Comece uma lista.</p><button class="button dark" (click)="openCreate()">Criar meu primeiro catálogo ＋</button></div>}}
@else if(view()==='collection'){@if(collection();as c){<div class="section-heading"><div><a routerLink="/catalogos" class="text-link">← Todos os catálogos</a><p>{{c.description}}</p></div><button class="button outline small" (click)="edit(c)">Editar catálogo</button></div>@if(c.items?.length){<div class="offer-grid personal-grid">@for(o of c.items;track o.id){<div><offer-card [offer]="o" placement="collection"/><button class="text-button remove-item" (click)="removeItem(o.id)">Remover do catálogo</button></div>}</div>}@else{<div class="empty-state"><span class="empty-icon">✧</span><h2>Seu próximo achado cabe aqui</h2><p>Use “＋ Catálogo” nas ofertas para adicioná-las a esta lista.</p><a routerLink="/" class="button dark">Explorar ofertas ↗</a></div>}}}
@else if(view()==='filters'){@if(filters().length){<div class="saved-filter-grid">@for(f of filters();track f.id){<article class="saved-filter-card"><span class="empty-icon">⌕</span><h2>{{f.name}}</h2><p>{{f.filters.q||'Todas as ofertas'}}{{filterCategory(f)?' · '+filterCategory(f):''}}</p><div class="flex-between"><a routerLink="/" [queryParams]="f.filters" fragment="ofertas" class="button dark small">Buscar ofertas ↗</a><button class="text-button danger-text" (click)="confirmDelete('filter',f.id,f.name)">Excluir</button></div></article>}</div>}@else{<div class="empty-state"><span class="empty-icon">⌕</span><h2>Encontre de novo, sem começar do zero</h2><p>Configure os filtros na busca e escolha “Salvar este filtro”.</p><a routerLink="/" class="button dark">Criar minha primeira busca ↗</a></div>}}
@else if(view()==='account'){<section class="account-card"><div class="account-avatar"><user-avatar [name]="api.user()?.name || 'Usuário'" [photo]="api.user()?.avatar" /></div><h2>{{api.user()?.name}}</h2><p>{{api.user()?.email}}</p><span class="badge">{{api.user()?.role==='admin'?'Administrador':'Conta Google conectada'}}</span><p class="muted">Seus catálogos são privados. O Espertinho não tem acesso à sua conta de compras nos marketplaces.</p><button class="button outline" (click)="logout()">Sair da conta</button>@if(api.user()?.role!=='admin'){<button class="text-button danger-text" (click)="confirmDelete('account','','sua conta e todos os favoritos, filtros e catálogos')">Excluir minha conta</button>}</section>}
@if(view()!=='account'){<app-infinite-scroll [busy]="loading()" [failed]="failed()" [hasMore]="feed.hasMore()" (more)="feed.next()"/>}
</div>
@if(modal()){<div class="modal-backdrop" (dismissOnBackdrop)="!saving() && modal.set(false)"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="personal-modal"><button class="close-button" type="button" aria-label="Fechar" (click)="modal.set(false)">×</button><h2 id="personal-modal">{{editing?'Editar catálogo':'Um novo plano começa aqui'}}</h2><form (ngSubmit)="saveCollection()"><label>Nome do catálogo<input name="name" [(ngModel)]="name" required maxlength="80" placeholder="Ex.: Meu novo escritório"></label><label>Descrição <span class="muted">(opcional)</span><textarea name="description" [(ngModel)]="description" maxlength="400" rows="3"></textarea></label><button class="button dark" [disabled]="saving()">{{saving()?'Salvando…':'Salvar catálogo'}}</button></form></section></div>}
@if(deletion()){<div class="modal-backdrop" (dismissOnBackdrop)="!saving() && deletion.set(null)"><section class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Excluir {{deletion()!.name}}?</h2><p>Essa ação não pode ser desfeita.</p><div class="button-row"><button class="button outline" (click)="deletion.set(null)">Cancelar</button><button class="button danger" [disabled]="saving()" (click)="deleteConfirmed()">{{saving()?'Excluindo…':'Confirmar exclusão'}}</button></div></section></div>}
`})
export class PersonalPage implements OnInit {
  api=inject(Api);route=inject(ActivatedRoute);router=inject(Router);destroy=inject(DestroyRef);title=inject(Title);view=signal('favorites');feed=new PagedData<any>(page=>this.requestPage(page),result=>{this.offers.set(this.feed.items());this.collections.set(this.feed.items());this.filters.set(this.feed.items());if(this.view()==='collection')this.collection.set({...result as unknown as Collection,items:this.feed.items()});});loading=this.feed.loading;failed=this.feed.failed;saving=signal(false);offers=signal<Offer[]>([]);collections=signal<Collection[]>([]);collection=signal<Collection|null>(null);categories=signal<CategoryNode[]>([]);filters=signal<SavedFilter[]>([]);modal=signal(false);name='';description='';editing='';deletion=signal<{kind:string;id:string;name:string}|null>(null);
  constructor(){effect(()=>{const favorites=this.api.favorites();untracked(()=>{if(this.view()==='favorites'&&this.feed.items().some(item=>!favorites.has(item.id)))void this.load();});});}
  filterCategory(f:SavedFilter){return this.categories().find(c=>c.id===f.filters.categoryId)?.path.join(' › ')||f.filters.category;}
  heading(){return ({favorites:'Seus favoritos',collections:'Meus catálogos',collection:this.collection()?.name||'Seu catálogo',filters:'Meus filtros salvos',account:'Minha conta'} as Record<string,string>)[this.view()];}
  ngOnInit(){this.route.data.pipe(takeUntilDestroyed(this.destroy)).subscribe(d=>{this.view.set(d['view']);void this.load();});}
  async requestPage(page:number):Promise<PageResult<any>>{
    const query={paginate:true,page};
    switch(this.view()){
      case 'favorites':return this.api.get('/me/favorites',query);
      case 'collections':return this.api.get('/me/collections',query);
      case 'filters':return this.api.get('/me/filters',query);
      case 'collection':{const result=await this.api.get<Collection&PageResult<Offer>>('/me/collections/'+this.route.snapshot.paramMap.get('id'),query);return {...result};}
      default:return {items:[],total:0,page:1,pageSize:20};
    }
  }
  async load(){
    this.offers.set([]);this.collections.set([]);this.filters.set([]);this.collection.set(null);
    if(this.view()==='filters')void this.api.get<CategoryNode[]>('/category-tree').then(categories=>this.categories.set(categories)).catch(()=>{});
    await this.feed.reset();this.title.setTitle(this.heading()+' | O Espertinho');
  }

  openCreate(){this.editing='';this.name='';this.description='';this.modal.set(true);}edit(c:Collection){this.editing=c.id;this.name=c.name;this.description=c.description;this.modal.set(true);}
  async saveCollection(){this.saving.set(true);try{await this.api.send(this.editing?'PATCH':'POST','/me/collections'+(this.editing?'/'+this.editing:''),{name:this.name,description:this.description});this.modal.set(false);this.api.success('Catálogo salvo.');await this.load();}catch(e){this.api.fail(e);}finally{this.saving.set(false);}}
  async removeItem(id:string){try{await this.api.send('DELETE',`/me/collections/${this.collection()!.id}/items/${id}`);await this.load();this.api.success('Oferta removida do catálogo.');}catch(e){this.api.fail(e);}}
  confirmDelete(kind:string,id:string,name:string){this.deletion.set({kind,id,name});}
  async deleteConfirmed(){const d=this.deletion();if(!d)return;this.saving.set(true);try{await this.api.send('DELETE',d.kind==='account'?'/me/account':d.kind==='filter'?'/me/filters/'+d.id:'/me/collections/'+d.id);this.deletion.set(null);if(d.kind==='account'){this.api.forgetAccount();await this.router.navigate(['/']);}else await this.load();this.api.success('Exclusão concluída.');}catch(e){this.api.fail(e);}finally{this.saving.set(false);}}
  async logout(){try{await this.api.logout();await this.router.navigate(['/']);}catch(e){this.api.fail(e);}}
}
