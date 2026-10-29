import {AngularNodeAppEngine,createNodeRequestHandler,isMainModule,writeResponseToNodeResponse} from '@angular/ssr/node';
import express from 'express';
import {registerSitemaps} from './sitemap';
import {apiProxy} from './proxy';
import {securityHeaders} from './security-headers';
import {fileURLToPath} from 'node:url';
import {apiOrigin} from './server-config';
const allowedHosts=(process.env['ALLOWED_HOSTS']||'localhost,127.0.0.1').split(',').map(s=>s.trim()).filter(Boolean);
const app=express(),engine=new AngularNodeAppEngine({allowedHosts});
app.disable('x-powered-by');
app.get('/health',(_req,res)=>res.json({status:'ok'}));
app.use('/api',apiProxy(apiOrigin()));
app.use(securityHeaders);
registerSitemaps(app,apiOrigin());
app.use((req,res,next)=>{
 if(/^\/(?:entrar|minha-conta|favoritos|filtros|catalogos|admin)(?:\/|$)/.test(req.path)) res.set('X-Robots-Tag','noindex, follow');
 next();
});
app.use(express.static(fileURLToPath(new URL('../browser/',import.meta.url)),{maxAge:'1y',index:false,redirect:false}));
app.use((req,res,next)=>{engine.handle(req,{cspNonce:res.locals['cspNonce']}).then(response=>response?writeResponseToNodeResponse(response,res):next()).catch(next);});
if(isMainModule(import.meta.url)) {const port=Number(process.env['PORT']||4200);app.listen(port,process.env['HOST']||'127.0.0.1',()=>console.log(`Espertinho: http://localhost:${port}`));}
export const reqHandler=createNodeRequestHandler(app);
