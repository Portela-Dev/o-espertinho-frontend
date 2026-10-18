import {bootstrapApplication,BootstrapContext} from '@angular/platform-browser';
import {mergeApplicationConfig,inject,CSP_NONCE,REQUEST_CONTEXT} from '@angular/core';
import {provideServerRendering,withRoutes,RenderMode} from '@angular/ssr';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';
import {API_ORIGIN} from './app/api-origin';
import {apiOrigin} from './server-config';
const config=mergeApplicationConfig(appConfig,{providers:[{provide:CSP_NONCE,useFactory:()=>{const context=inject(REQUEST_CONTEXT) as {cspNonce?:string}|null;return context?.cspNonce??null;}},{provide:API_ORIGIN,useValue:apiOrigin()},provideServerRendering(withRoutes([
  {path:'entrar',renderMode:RenderMode.Client},{path:'minha-conta',renderMode:RenderMode.Client},
  {path:'favoritos',renderMode:RenderMode.Client},{path:'filtros',renderMode:RenderMode.Client},
  {path:'catalogos',renderMode:RenderMode.Client},{path:'catalogos/**',renderMode:RenderMode.Client},
  {path:'admin',renderMode:RenderMode.Client},{path:'admin/**',renderMode:RenderMode.Client},
  {path:'**',renderMode:RenderMode.Server}
]))]});
export default (context:BootstrapContext)=>bootstrapApplication(AppComponent,config,context);
