import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createServer} from 'node:http';
import {apiProxy} from '../src/proxy.ts';
import {securityHeaders} from '../src/security-headers.ts';
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
async function stop(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
test('proxy transmite método, query, cookie, XSRF e Set-Cookie com destino fixo',async()=>{
 let seen;const upstream=createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{seen={url:req.url,method:req.method,cookie:req.headers.cookie,xsrf:req.headers['x-xsrf-token'],body};res.writeHead(201,{'Content-Type':'application/json','Set-Cookie':'espertinho.sid=test; HttpOnly; SameSite=Lax'});res.end('{"ok":true}');});});
 const origin=await listen(upstream),app=express();app.use('/api',apiProxy(origin));const server=createServer(app),base=await listen(server);
 try{const response=await fetch(base+'/api/me/collections?q=one',{method:'POST',headers:{Cookie:'espertinho.sid=test','X-XSRF-TOKEN':'test-token','Content-Type':'application/json'},body:'{"name":"Teste"}'});assert.equal(response.status,201);assert.deepEqual(await response.json(),{ok:true});assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.deepEqual(seen,{url:'/api/me/collections?q=one',method:'POST',cookie:'espertinho.sid=test',xsrf:'test-token',body:'{"name":"Teste"}'});
 }finally{await stop(server);await stop(upstream);}
});
test('CSP usa nonce por resposta, proíbe scripts inline e autoriza o login Google',async()=>{
 const app=express();app.use(securityHeaders);app.get('/',(_req,res)=>res.send('ok'));const server=createServer(app),base=await listen(server);
 try{const first=await fetch(base),second=await fetch(base);const csp=first.headers.get('content-security-policy');assert.match(csp,/script-src 'self' 'nonce-/);assert.match(csp,/https:\/\/accounts.google.com/);assert.match(csp,/script-src[^;]+https:\/\/connect.facebook.net/);assert.match(csp,/connect-src[^;]+https:\/\/www.facebook.com/);assert.match(csp,/frame-ancestors 'none'/);assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp));assert.notEqual(csp,second.headers.get('content-security-policy'));assert.equal(first.headers.get('x-content-type-options'),'nosniff');}finally{await stop(server);}
});
