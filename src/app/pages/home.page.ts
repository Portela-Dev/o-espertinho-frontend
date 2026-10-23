import {DismissOnBackdrop} from '../components/dismiss-on-backdrop';
import {PagedData} from '../paged-data';
import {InfiniteScroll} from '../components/infinite-scroll';
import {Component,inject,signal,OnInit,DestroyRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router,ActivatedRoute,RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Title,Meta} from '@angular/platform-browser';
import {Api} from '../api.service';
import {CategoryNode,Product,Filters,emptyFilters,MarketplaceSummary} from '../models';
import {MarketplaceLogo} from '../components/marketplace-logo';
import {CategoryBreadcrumb} from '../components/category-breadcrumb';
import {ProductCard} from '../components/product-card';
@Component({standalone:true,imports:[DismissOnBackdrop,InfiniteScroll,CategoryBreadcrumb,FormsModule,RouterLink,ProductCard,MarketplaceLogo],template:`
<div class="page-width">
@if(marketplaces().length){<div class="partner-row"><span>SEUS ACHADOS, NAS LOJAS QUE VOCÊ CONHECE</span>@for(m of marketplaces();track m.id){<button type="button" class="partner" [attr.aria-pressed]="filters.marketplace===m.id" (click)="store(m.id)"><marketplace-logo [url]="m.logo_url" [name]="m.name"/>{{m.name}}</button>}</div>}
<section id="ofertas" class="discovery" aria-label="Ofertas"><div class="discovery-tools"><a routerLink="/filtros" class="text-link">Meus filtros salvos ↗</a></div>
<form class="search-bar" (ngSubmit)="apply()"><span aria-hidden="true">⌕</span><input aria-label="Buscar ofertas" name="q" [(ngModel)]="searchText" (ngModelChange)="scheduleSearch()" placeholder="O que você quer encontrar hoje?" maxlength="160"><button class="button dark" type="submit">Buscar <span>↗</span></button></form>
<category-breadcrumb [names]="selectedCategory()?.path||[]" [ids]="breadcrumbIds()" [base]="breadcrumbBase()"/>
@if(childCategories().length){<nav class="category-navigation" aria-label="Categorias"><div class="category-chips">@for(c of childCategories();track c.id){<button type="button" (click)="category(c.id)">{{c.path[c.path.length-1]}}</button>}</div></nav>}
<div class="browse-layout"><aside class="filter-panel"><div class="filter-title"><h3>Do seu jeito</h3><button type="button" class="text-button" (click)="clear()">Limpar</button></div><form (ngSubmit)="apply()"><label>Loja<select name="marketplace" [(ngModel)]="filters.marketplace"><option value="">Todas as lojas</option>@for(m of marketplaces();track m.id){<option [value]="m.id">{{m.name}}</option>}</select></label><label>Preço máximo (R$)<input name="price" type="number" min="0" max="1000000" [(ngModel)]="maxReais" placeholder="Sem limite"></label><label>Ordenar por<select name="sort" [(ngModel)]="filters.sort"><option value="recent">Mais recentes</option><option value="price_asc">Menor preço</option><option value="discount">Maior desconto</option></select></label><button type="submit" class="button outline full">Aplicar filtros</button></form><button type="button" class="text-button save-filter" (click)="saveOpen.set(true)">＋ Salvar este filtro</button><div class="filter-note"><span>✦</span><strong>Gostou? Guarde.</strong><p>Seus favoritos e catálogos deixam as boas escolhas sempre por perto.</p><a routerLink="/catalogos">Organizar meus achados ↗</a></div></aside>
<div class="results"><div class="results-top"><span>{{loading()?'Procurando bons achados…':total()+' produtos disponíveis'}}</span><span class="review-label">✓ Revisão antes de publicar</span></div>
@if(loading()&&!offers().length){<div class="offer-grid">@for(i of [1,2,3,4,5,6];track i){<div class="skeleton-card" aria-hidden="true"></div>}</div>}
@else if(offers().length){<div class="offer-grid">@for(o of offers();track o.id){<product-card [product]="o" />}</div><app-infinite-scroll [busy]="feed.loading()" [failed]="feed.failed()" [hasMore]="feed.hasMore()" (more)="feed.next()"/>}
@else{<div class="empty-state"><span class="empty-icon">⌕</span><h3>{{failed()?'Não foi possível carregar as ofertas':'Os próximos achados estão a caminho'}}</h3><p>{{failed()?'Confira sua conexão e tente novamente.':'Ainda não há ofertas publicadas para esta seleção. Experimente outros filtros ou volte em breve.'}}</p><button type="button" class="button dark" (click)="failed()?load():clear()">{{failed()?'Tentar novamente':'Ver todas as ofertas'}}</button>@if(api.user()?.role==='admin'){<a routerLink="/admin/marketplaces" class="text-link">Configurar lojas e encontrar ofertas ↗</a>}</div>}
</div></div></section>
<section class="personal-banner"><div class="banner-icon">♡</div><div><p class="eyebrow">SUA LISTA, SEU JEITO</p><h2>Achou. Gostou. Guardou.</h2><p>Crie catálogos para seus planos e deixe seus favoritos em um só lugar.</p></div><a routerLink="/catalogos" class="button dark">Criar meu catálogo ↗</a></section>
</div>
@if(saveOpen()){<div class="modal-backdrop" (dismissOnBackdrop)="!saving() && saveOpen.set(false)"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="filter-modal-title"><button type="button" class="close-button" (click)="saveOpen.set(false)" aria-label="Fechar">×</button><h2 id="filter-modal-title">Salvar esta busca</h2><p>Encontre novas ofertas com os mesmos critérios quando quiser.</p><form (ngSubmit)="saveFilter()"><label>Nome do filtro<input name="filterName" [(ngModel)]="filterName" required maxlength="80" placeholder="Ex.: Meu próximo monitor"></label><button class="button dark" type="submit" [disabled]="saving()">{{saving()?'Salvando…':'Salvar filtro'}}</button></form></section></div>}
`})
export class HomePage implements OnInit {
  api=inject(Api);route=inject(ActivatedRoute);router=inject(Router);destroy=inject(DestroyRef);title=inject(Title);meta=inject(Meta);
  searchText='';private searchTimer:ReturnType<typeof setTimeout>|undefined;
  marketplaces=signal<MarketplaceSummary[]>([]);
  filters:Filters=emptyFilters();maxReais:number|null=null;feed=new PagedData<Product>(page=>this.api.get('/products',{...this.filters,page}));offers=this.feed.items;categories=signal<CategoryNode[]>([]);loading=this.feed.loading;failed=this.feed.failed;total=this.feed.total;saveOpen=signal(false);saving=signal(false);filterName='';
  ngOnInit(){this.destroy.onDestroy(()=>this.cancelSearch());void this.api.get<MarketplaceSummary[]>('/marketplaces').then(m=>this.marketplaces.set(m)).catch(()=>{});this.title.setTitle('O Espertinho');void this.api.get<CategoryNode[]>('/category-tree').then(c=>this.categories.set(c)).catch(()=>{});this.route.queryParams.pipe(takeUntilDestroyed(this.destroy)).subscribe(p=>{this.cancelSearch();this.filters={q:p['q']||'',marketplace:p['marketplace']||'',category:p['category']||'',categoryId:p['categoryId']||'',maxPrice:Number(p['maxPrice'])||0,sort:p['sort']||'recent'};this.searchText=this.filters.q;this.maxReais=this.filters.maxPrice?this.filters.maxPrice/100:null;void this.load();});}
  selectedCategory(){return this.categories().find(c=>this.filters.categoryId?c.id===this.filters.categoryId:c.path.length===1&&c.path[0]===this.filters.category);}
  childCategories(){const path=this.selectedCategory()?.path??[];return this.categories().filter(c=>c.path.length===path.length+1&&path.every((n,i)=>n===c.path[i]));}
  breadcrumbIds(){const path=this.selectedCategory()?.path??[];return path.map((_,i)=>this.categories().find(c=>c.path.length===i+1&&c.path.every((n,j)=>n===path[j]))?.id??'');}
  breadcrumbBase(){return {...this.filters,category:'',categoryId:'',page:1};}
  load(){return this.feed.reset();}

  private cancelSearch(){clearTimeout(this.searchTimer);this.searchTimer=undefined;}
  scheduleSearch(){this.cancelSearch();this.searchTimer=setTimeout(()=>{this.searchTimer=undefined;if(this.searchText!==this.filters.q)this.apply(true);},500);}
  apply(automatic=false){this.cancelSearch();this.filters.q=this.searchText;this.filters.maxPrice=this.maxReais?Math.round(this.maxReais*100):0;void this.router.navigate(['/'],{queryParams:{...this.filters,page:1},fragment:'ofertas',replaceUrl:automatic});}
  store(id:string){this.filters.marketplace=id;this.apply();}category(value:string){this.filters.category='';this.filters.categoryId=value;this.apply();}clear(){this.searchText='';this.filters=emptyFilters();this.maxReais=null;this.apply();}
  async saveFilter(){if(!this.api.user()){this.saveOpen.set(false);await this.router.navigate(['/entrar'],{queryParams:{next:this.router.url}});return;}this.saving.set(true);try{this.filters.maxPrice=this.maxReais?Math.round(this.maxReais*100):0;await this.api.send('POST','/me/filters',{name:this.filterName,filters:this.filters});this.saveOpen.set(false);this.filterName='';this.api.success('Filtro salvo. Acesse em Meus filtros.');}catch(e){this.api.fail(e);}finally{this.saving.set(false);}}
}
