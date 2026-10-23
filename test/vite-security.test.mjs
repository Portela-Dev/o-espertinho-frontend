import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('Vite não transforma uma URL relativa a protocolo em script de outra origem',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{hmr:false,middlewareMode:true,watch:null},optimizeDeps:{noDiscovery:true}});
 try{
  const attack='//security-audit.invalid/payload.js?/../../package.json';
  const html='<html><body><script type="module">document.body.dataset.ready="yes";</script></body></html>';
  let transformed;
  try{transformed=await vite.transformIndexHtml(attack,html);}catch(error){assert.match(error.message,/url|path|request/i);return;}
  assert.doesNotMatch(transformed,/<script[^>]+src=["']\/\/security-audit\.invalid/i);
  assert.ok(transformed.includes('<html>'));
 }finally{await vite.close();}
});
