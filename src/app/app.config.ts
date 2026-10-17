import {ApplicationConfig,inject,PLATFORM_ID,LOCALE_ID} from '@angular/core';
import {isPlatformServer,registerLocaleData} from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt);
import {provideRouter,withInMemoryScrolling,CanActivateFn,Router} from '@angular/router';
import {provideHttpClient,withInterceptors,withXsrfConfiguration} from '@angular/common/http';
import {provideClientHydration,withEventReplay} from '@angular/platform-browser';
import {Api} from './api.service';
import {API_ORIGIN} from './api-origin';
const auth:CanActivateFn=async(_route,state)=>{const api=inject(Api),router=inject(Router);if(!api.ready())await api.init();return api.user()?true:router.createUrlTree(['/entrar'],{queryParams:{next:state.url}});};
const admin:CanActivateFn=async(route)=>{const api=inject(Api),router=inject(Router);if(!api.ready())await api.init();if(!api.canAdmin())return router.createUrlTree(['/']);const section=route.paramMap.get('section')||'overview';return api.adminSection(section)?true:router.createUrlTree(['/admin',api.firstAdminSection()]);};
export const appConfig:ApplicationConfig={providers:[
  {provide:LOCALE_ID,useValue:'pt-BR'},
  provideHttpClient(withXsrfConfiguration({cookieName:'XSRF-TOKEN',headerName:'X-XSRF-TOKEN'}),withInterceptors([(req,next)=>{
    if(isPlatformServer(inject(PLATFORM_ID))&&req.url.startsWith('/api/'))return next(req.clone({url:inject(API_ORIGIN)+req.url}));return next(req);
  }])),provideClientHydration(withEventReplay()),
  provideRouter([
    {path:'',loadComponent:()=>import('./pages/home.page').then(m=>m.HomePage)},
    {path:'produto/:id',loadComponent:()=>import('./pages/product.page').then(m=>m.ProductPage)},
    {path:'oferta/:id',loadComponent:()=>import('./pages/offer.page').then(m=>m.OfferPage)},
    {path:'entrar',loadComponent:()=>import('./pages/login.page').then(m=>m.LoginPage)},
    {path:'favoritos',canActivate:[auth],loadComponent:()=>import('./pages/personal.page').then(m=>m.PersonalPage),data:{view:'favorites'}},
    {path:'filtros',canActivate:[auth],loadComponent:()=>import('./pages/personal.page').then(m=>m.PersonalPage),data:{view:'filters'}},
    {path:'catalogos',canActivate:[auth],loadComponent:()=>import('./pages/personal.page').then(m=>m.PersonalPage),data:{view:'collections'}},
    {path:'catalogos/:id',canActivate:[auth],loadComponent:()=>import('./pages/personal.page').then(m=>m.PersonalPage),data:{view:'collection'}},
    {path:'minha-conta',canActivate:[auth],loadComponent:()=>import('./pages/personal.page').then(m=>m.PersonalPage),data:{view:'account'}},
    {path:'admin',canActivate:[admin],loadComponent:()=>import('./pages/admin.page').then(m=>m.AdminPage)},
    {path:'admin/:section',canActivate:[admin],loadComponent:()=>import('./pages/admin.page').then(m=>m.AdminPage)},
    {path:'sobre',loadComponent:()=>import('./pages/legal.page').then(m=>m.LegalPage),data:{view:'about'}},
    {path:'privacidade',loadComponent:()=>import('./pages/legal.page').then(m=>m.LegalPage),data:{view:'privacy'}},
    {path:'termos',loadComponent:()=>import('./pages/legal.page').then(m=>m.LegalPage),data:{view:'terms'}},
    {path:'**',loadComponent:()=>import('./pages/legal.page').then(m=>m.LegalPage),data:{view:'404'}}
  ],withInMemoryScrolling({scrollPositionRestoration:'enabled'}))
]};
