import {request as httpRequest,type IncomingHttpHeaders} from 'node:http';
import {request as httpsRequest} from 'node:https';
import type {RequestHandler} from 'express';
const hopHeaders=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
function cleanHeaders(headers:IncomingHttpHeaders){
 const result={...headers};const nominated=String(headers.connection||'').split(',').map(s=>s.trim().toLowerCase());
 for(const key of [...hopHeaders,...nominated]){delete result[key];}
 return result;
}
export function apiProxy(origin:string):RequestHandler{
 const target=new URL(origin),request=target.protocol==='https:'?httpsRequest:httpRequest;
 return (req,res)=>{
  const upstream=request({protocol:target.protocol,hostname:target.hostname,port:target.port||undefined,method:req.method,path:'/api'+req.url,headers:cleanHeaders(req.headers)},response=>{
   res.writeHead(response.statusCode||502,cleanHeaders(response.headers));
   response.on('error',()=>res.destroy());response.pipe(res);
  });
  upstream.setTimeout(120000,()=>upstream.destroy(new Error('Tempo limite do backend.')));
  upstream.on('error',()=>{if(!res.headersSent)res.status(502).json({error:'Não foi possível conectar ao servidor.'});else res.destroy();});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});req.pipe(upstream);
 };
}
