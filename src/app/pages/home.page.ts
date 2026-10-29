import {Seo} from '../seo.service';
import {HOME_TITLE, HOME_DESCRIPTION, listingPath, pageNumber, indexableListing, breadcrumbs} from '../seo-data';
import { DismissOnBackdrop } from '../components/dismiss-on-backdrop';
import { PagedData } from '../paged-data';
import { InfiniteScroll } from '../components/infinite-scroll';
import { Component, inject, signal, OnInit, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from '../api.service';
import {
  CategoryNode,
  Product,
  Filters,
  emptyFilters,
  MarketplaceSummary,
} from '../models';
import { MarketplaceLogo } from '../components/marketplace-logo';
import { CategoryBreadcrumb } from '../components/category-breadcrumb';
import { ProductCard } from '../components/product-card';
@Component({
  standalone: true,
  imports: [
    NgTemplateOutlet,
    DismissOnBackdrop,
    InfiniteScroll,
    CategoryBreadcrumb,
    FormsModule,
    RouterLink,
    ProductCard,
    MarketplaceLogo,
  ],
  styles: `.browse-heading{font-size:clamp(1.15rem,2.5vw,1.6rem);margin:16px 0 8px}.crawl-pagination{display:flex;gap:16px;justify-content:center;margin:12px 0}.crawl-pagination a{font-size:.85rem;color:var(--muted);text-decoration:underline}`,
  template: `
    <div class="page-width">
      @if (marketplaces().length) {
        <div class="partner-row">
          <span>SEUS ACHADOS, NAS LOJAS QUE VOCÊ CONHECE</span>
          @for (m of marketplaces(); track m.id) {
            <button
              type="button"
              class="partner"
              [attr.aria-pressed]="filters.marketplace === m.id"
              [attr.aria-label]="m.name"
              [title]="m.name"
              (click)="store(m.id)"
            >
              <marketplace-logo [url]="m.logo_url" [name]="m.name" /><span class="partner-name">{{ m.name }}</span>
            </button>
          }
        </div>
      }
      <section id="ofertas" class="discovery" aria-label="Ofertas">
        <h1 class="browse-heading">{{heading()}}</h1>
        <div class="discovery-tools">
          <button type="button" class="button outline mobile-browse-toggle" (click)="openBrowseMenu()" aria-haspopup="dialog" aria-controls="mobile-browse-menu" [attr.aria-expanded]="browseMenuOpen()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M3 21h8m-5-3v6"/></svg>
            Pesquisar e filtrar
          </button>
          <a routerLink="/filtros" class="text-link desktop-saved-filters">Meus filtros salvos ↗</a>
        </div>
        <div class="desktop-search"><ng-container [ngTemplateOutlet]="searchControls" /></div>
        <div class="home-breadcrumb" [class.has-category]="selectedCategory()">
        <category-breadcrumb
          [names]="selectedCategory()?.path || []"
          [ids]="breadcrumbIds()"
          [base]="breadcrumbBase()"
        />
        </div>
        @if (childCategories().length) {
          <nav class="category-navigation home-category-navigation" aria-label="Categorias">
            <div class="category-chips">
              @for (c of childCategories(); track c.id) {
                <a routerLink="/" [queryParams]="categoryQuery(c.id)" fragment="ofertas">
                  {{ c.path[c.path.length - 1] }}
                </a>
              }
            </div>
          </nav>
        }
        <div class="browse-layout">
          <div class="desktop-filters"><ng-container [ngTemplateOutlet]="filterControls" /></div>
          <div class="results">
            <div class="results-top">
              <span>{{
                loading()
                  ? 'Procurando bons achados…'
                  : total() + ' produtos disponíveis'
              }}</span
              ><span class="review-label">✓ Revisão antes de publicar</span>
            </div>
            @if (loading() && !offers().length) {
              <div class="offer-grid">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                  <div class="skeleton-card" aria-hidden="true"></div>
                }
              </div>
            } @else if (offers().length) {
              <div class="offer-grid">
                @for (o of offers(); track o.id) {
                  <product-card [product]="o" [priority]="$index===0" />
                }
              </div>
              <nav class="crawl-pagination" aria-label="Páginas de produtos">
                @if(browsePage>1){<a [routerLink]="pageLink(browsePage-1)" rel="prev">Página anterior</a>}
                @if(feed.hasMore()){<a [routerLink]="pageLink(feed.page()+1)" rel="next">Próxima página</a>}
              </nav>
              <app-infinite-scroll
                [busy]="feed.loading()"
                [failed]="feed.failed()"
                [hasMore]="feed.hasMore()"
                (more)="feed.next()"
              />
            } @else {
              <div class="empty-state">
                <span class="empty-icon">⌕</span>
                <h3>
                  {{
                    failed()
                      ? 'Não foi possível carregar as ofertas'
                      : 'Os próximos achados estão a caminho'
                  }}
                </h3>
                <p>
                  {{
                    failed()
                      ? 'Confira sua conexão e tente novamente.'
                      : 'Ainda não há ofertas publicadas para esta seleção. Experimente outros filtros ou volte em breve.'
                  }}
                </p>
                <button
                  type="button"
                  class="button dark"
                  (click)="failed() ? load() : clear()"
                >
                  {{ failed() ? 'Tentar novamente' : 'Ver todas as ofertas' }}
                </button>
                @if (api.user()?.role === 'admin') {
                  <a routerLink="/admin/marketplaces" class="text-link"
                    >Configurar lojas e encontrar ofertas ↗</a
                  >
                }
              </div>
            }
          </div>
        </div>
      </section>
      <section class="personal-banner">
        <div class="banner-icon">♡</div>
        <div>
          <p class="eyebrow">SUA LISTA, SEU JEITO</p>
          <h2>Achou. Gostou. Guardou.</h2>
          <p>
            Crie catálogos para seus planos e deixe seus favoritos em um só
            lugar.
          </p>
        </div>
        <a routerLink="/catalogos" class="button dark">Criar meu catálogo ↗</a>
      </section>
    </div>
    <ng-template #searchControls>
        <form class="search-bar" (ngSubmit)="submitFilters()">
          <span aria-hidden="true">⌕</span
          ><input
            aria-label="Buscar ofertas"
            name="q"
            [(ngModel)]="searchText"
            (ngModelChange)="scheduleSearch()"
            placeholder="O que você quer encontrar hoje?"
            maxlength="160"
          /><button class="button dark" type="submit">
            Buscar <span>↗</span>
          </button>
        </form>
    </ng-template>
    <ng-template #filterControls>
          <aside class="filter-panel">
            <div class="filter-title">
              <h3>Do seu jeito</h3>
              <button type="button" class="text-button" (click)="clear()">
                Limpar
              </button>
            </div>
            <form (ngSubmit)="submitFilters()">
              <label class="mobile-category-filter">Categoria
                <select name="categoryId" [ngModel]="selectedCategory()?.id || ''" (ngModelChange)="category($event)">
                  <option value="">Todas as categorias</option>
                  @for(c of categories();track c.id){<option [value]="c.id">{{c.path.join(' › ')}}</option>}
                </select>
              </label>
              <label
                >Loja<select
                  name="marketplace"
                  [(ngModel)]="filters.marketplace"
                >
                  <option value="">Todas as lojas</option>
                  @for (m of marketplaces(); track m.id) {
                    <option [value]="m.id">{{ m.name }}</option>
                  }
                </select></label
              ><label
                >Preço máximo (R$)<input
                  name="price"
                  type="number"
                  min="0"
                  max="1000000"
                  [(ngModel)]="maxReais"
                  placeholder="Sem limite" /></label
              ><label
                >Ordenar por<select name="sort" [(ngModel)]="filters.sort">
                  <option value="recent">Mais recentes</option>
                  <option value="price_asc">Menor preço</option>
                  <option value="discount">Maior desconto</option>
                </select></label
              ><button type="submit" class="button outline full">
                Aplicar filtros
              </button>
            </form>
            <button
              type="button"
              class="text-button save-filter"
              (click)="openSaveFilter()"
            >
              ＋ Salvar este filtro
            </button>
            <div class="filter-note">
              <span>✦</span><strong>Gostou? Guarde.</strong>
              <p>
                Seus favoritos e catálogos deixam as boas escolhas sempre por
                perto.
              </p>
              <a routerLink="/catalogos">Organizar meus achados ↗</a>
            </div>
          </aside>
    </ng-template>
    <dialog #browseMenu id="mobile-browse-menu" class="mobile-browse-menu" aria-labelledby="browse-menu-title" (dismissOnBackdrop)="closeBrowseMenu()" (close)="browseMenuOpen.set(false)">
      <div class="browse-menu-heading"><h2 id="browse-menu-title">Pesquisar e filtrar</h2><button type="button" class="button outline" (click)="closeBrowseMenu()" aria-label="Fechar pesquisa e filtros">×</button></div>
      @if(browseMenuOpen()) {
        <ng-container [ngTemplateOutlet]="searchControls" />
        <ng-container [ngTemplateOutlet]="filterControls" />
        <a routerLink="/filtros" class="text-link" (click)="closeBrowseMenu()">Meus filtros salvos ↗</a>
      }
    </dialog>
    @if (saveOpen()) {
      <div
        class="modal-backdrop"
        (dismissOnBackdrop)="!saving() && saveOpen.set(false)"
      >
        <dialog
          open
          class="modal"
          aria-modal="true"
          aria-labelledby="filter-modal-title"
        >
          <button
            type="button"
            class="close-button"
            (click)="saveOpen.set(false)"
            aria-label="Fechar"
          >
            ×
          </button>
          <h2 id="filter-modal-title">Salvar esta busca</h2>
          <p>Encontre novas ofertas com os mesmos critérios quando quiser.</p>
          <form (ngSubmit)="saveFilter()">
            <label
              >Nome do filtro<input
                name="filterName"
                [(ngModel)]="filterName"
                required
                maxlength="80"
                placeholder="Ex.: Meu próximo monitor" /></label
            ><button class="button dark" type="submit" [disabled]="saving()">
              {{ saving() ? 'Salvando…' : 'Salvar filtro' }}
            </button>
          </form>
        </dialog>
      </div>
    }
  `,
})
export class HomePage implements OnInit {
  readonly browseMenu = viewChild<ElementRef<HTMLDialogElement>>('browseMenu');
  readonly browseMenuOpen = signal(false);
  openBrowseMenu() {
    const dialog = this.browseMenu()?.nativeElement;
    if (dialog && !dialog.open) {
      this.browseMenuOpen.set(true);
      dialog.showModal();
    }
  }
  closeBrowseMenu() { this.browseMenu()?.nativeElement.close(); this.browseMenuOpen.set(false); }
  submitFilters() { this.apply(); this.closeBrowseMenu(); }
  openSaveFilter() { this.closeBrowseMenu(); this.saveOpen.set(true); }

  api = inject(Api);
  route = inject(ActivatedRoute);
  router = inject(Router);
  destroy = inject(DestroyRef);
  seo = inject(Seo);
  browsePage=1;
  private active=true;
  searchText = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  marketplaces = signal<MarketplaceSummary[]>([]);
  filters: Filters = emptyFilters();
  maxReais: number | null = null;
  feed = new PagedData<Product>((page) =>
    this.api.get('/products', { ...this.filters, page }),
  );
  offers = this.feed.items;
  categories = signal<CategoryNode[]>([]);
  loading = this.feed.loading;
  failed = this.feed.failed;
  total = this.feed.total;
  saveOpen = signal(false);
  saving = signal(false);
  filterName = '';
  ngOnInit() {
    this.destroy.onDestroy(() => {this.cancelSearch();this.active=false;});
    void this.api
      .get<MarketplaceSummary[]>('/marketplaces')
      .then((m) => this.marketplaces.set(m))
      .catch(() => {});

    void this.api
      .get<CategoryNode[]>('/category-tree')
      .then((c) => {this.categories.set(c);this.updateSeo();})
      .catch(() => {});
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((p) => {
        this.cancelSearch();
        this.filters = {
          q: p['q'] || '',
          marketplace: p['marketplace'] || '',
          category: p['category'] || '',
          categoryId: p['categoryId'] || '',
          maxPrice: Number(p['maxPrice']) || 0,
          sort: p['sort'] || 'recent',
        };
        this.searchText = this.filters.q;
        this.maxReais = this.filters.maxPrice
          ? this.filters.maxPrice / 100
          : null;
        this.browsePage=pageNumber(p['page']);
        void this.load();
      });
  }
  selectedCategory() {
    return this.categories().find((c) =>
      this.filters.categoryId
        ? c.id === this.filters.categoryId
        : c.path.length === 1 && c.path[0] === this.filters.category,
    );
  }
  childCategories() {
    const path = this.selectedCategory()?.path ?? [];
    return this.categories().filter(
      (c) =>
        c.path.length === path.length + 1 &&
        path.every((n, i) => n === c.path[i]),
    );
  }
  breadcrumbIds() {
    const path = this.selectedCategory()?.path ?? [];
    return path.map(
      (_, i) =>
        this.categories().find(
          (c) =>
            c.path.length === i + 1 && c.path.every((n, j) => n === path[j]),
        )?.id ?? '',
    );
  }
  breadcrumbBase() {
    return { ...this.filters, category: '', categoryId: '', page: 1 };
  }
  async load() {
    if(!this.browsePage){this.seo.failure(404);return;}
    await this.feed.reset(this.browsePage);
    this.updateSeo();
  }
  heading(){const path=this.selectedCategory()?.path;return path?.length?path.at(-1)+' — compare preços':'Compare preços e encontre ofertas';}
  pagePath(page:number){return listingPath({...this.filters,...(this.selectedCategory()?{categoryId:this.selectedCategory()!.id}: {})},page);}
  pageLink(page:number){return this.router.parseUrl(this.pagePath(page));}
  categoryQuery(id:string){return {...this.filters,category:'',categoryId:id,page:1};}
  updateSeo(){
    if(!this.active)return;
    if(!this.browsePage){this.seo.failure(404);return;}
    if(this.feed.failed()){this.seo.failure(this.feed.errorStatus());return;}
    const category=this.selectedCategory(),path=category?.path||[];
    const name=path.at(-1);
    const pageSuffix=this.browsePage>1?' — página '+this.browsePage:'';
    const title=name?name+' — compare preços'+pageSuffix+' | O Espertinho':HOME_TITLE.replace(' |',''+pageSuffix+' |');
    const description=name?'Compare preços de '+name.toLowerCase()+' nas lojas monitoradas. Veja ofertas, condições e histórico de preços no Espertinho.':HOME_DESCRIPTION;
    this.seo.set({title,description,path:this.pagePath(this.browsePage),indexable:indexableListing(this.filters)&&this.feed.total()>0,schemas:name?[breadcrumbs(path,this.breadcrumbIds())]:[{'@type':'WebSite',name:'O Espertinho',url:'https://oespertinho.com.br/'}]});
    if(this.browsePage>1&&!this.offers().length) this.seo.failure(404);
    if(this.categories().length&&this.filters.categoryId&&!category) this.seo.failure(404);
  }

  private cancelSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
  }
  scheduleSearch() {
    this.cancelSearch();
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      if (this.searchText !== this.filters.q) this.apply(true);
    }, 500);
  }
  apply(automatic = false) {
    this.cancelSearch();
    this.filters.q = this.searchText;
    this.filters.maxPrice = this.maxReais ? Math.round(this.maxReais * 100) : 0;
    void this.router.navigate(['/'], {
      queryParams: { ...this.filters, page: 1 },
      fragment: 'ofertas',
      replaceUrl: automatic,
    });
  }
  store(id: string) {
    this.filters.marketplace = this.filters.marketplace === id ? '' : id;
    this.apply();
  }
  category(value: string) {
    this.filters.category = '';
    this.filters.categoryId = value;
    this.apply();
  }
  clear() {
    this.searchText = '';
    this.filters = emptyFilters();
    this.maxReais = null;
    this.apply();
  }
  async saveFilter() {
    if (!this.api.user()) {
      this.saveOpen.set(false);
      await this.router.navigate(['/entrar'], {
        queryParams: { next: this.router.url },
      });
      return;
    }
    this.saving.set(true);
    try {
      this.filters.maxPrice = this.maxReais
        ? Math.round(this.maxReais * 100)
        : 0;
      await this.api.send('POST', '/me/filters', {
        name: this.filterName,
        filters: this.filters,
      });
      this.saveOpen.set(false);
      this.filterName = '';
      this.api.success('Filtro salvo. Acesse em Meus filtros.');
    } catch (e) {
      this.api.fail(e);
    } finally {
      this.saving.set(false);
    }
  }
}
