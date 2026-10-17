import {AngularNodeAppEngine,createNodeRequestHandler,isMainModule,writeResponseToNodeResponse} from '@angular/ssr/node';
import express from 'express';
import {createProxyMiddleware} from 'http-proxy-middleware';
import {fileURLToPath} from 'node:url';
const allowedHosts=(process.env['ALLOWED_HOSTS']||'localhost,127.0.0.1').split(',').map(s=>s.trim()).filter(Boolean);
const app=express(),engine=new AngularNodeAppEngine({allowedHosts});
app.disable('x-powered-by');
app.use('/api',createProxyMiddleware({target:'http://127.0.0.1:3000',changeOrigin:false,pathRewrite:(path)=>'/api'+path}));
app.use(express.static(fileURLToPath(new URL('../browser/',import.meta.url)),{maxAge:'1y',index:false,redirect:false}));
app.use((req,res,next)=>{engine.handle(req).then(response=>response?writeResponseToNodeResponse(response,res):next()).catch(next);});
if(isMainModule(import.meta.url)) {const port=Number(process.env['PORT']||4200);app.listen(port,'127.0.0.1',()=>console.log(`Espertinho: http://localhost:${port}`));}
export const reqHandler=createNodeRequestHandler(app);
