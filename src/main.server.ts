import {bootstrapApplication,BootstrapContext} from '@angular/platform-browser';
import {mergeApplicationConfig} from '@angular/core';
import {provideServerRendering,withRoutes,RenderMode} from '@angular/ssr';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';
const config=mergeApplicationConfig(appConfig,{providers:[provideServerRendering(withRoutes([
  {path:'entrar',renderMode:RenderMode.Client},{path:'minha-conta',renderMode:RenderMode.Client},
  {path:'favoritos',renderMode:RenderMode.Client},{path:'filtros',renderMode:RenderMode.Client},
  {path:'catalogos',renderMode:RenderMode.Client},{path:'catalogos/**',renderMode:RenderMode.Client},
  {path:'admin',renderMode:RenderMode.Client},{path:'admin/**',renderMode:RenderMode.Client},
  {path:'**',renderMode:RenderMode.Server}
]))]});
export default (context:BootstrapContext)=>bootstrapApplication(AppComponent,config,context);
