import {spawn} from 'node:child_process';
import {mkdir,open,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';

const backend=resolve(process.env.E2E_BACKEND_DIR||'.ci-backend');
const apiPort=Number(process.env.CI_API_PORT||3000),webPort=Number(process.env.CI_WEB_PORT||4200);
const base=`http://localhost:${webPort}`;
const children=[],logs=[];
await mkdir('reports/web',{recursive:true});
if(process.env.COLLECT_BROWSER_COVERAGE){
 const raw=resolve('coverage/browser-raw');
 if(dirname(raw)!==resolve('coverage'))throw new Error('Diretório de cobertura inválido.');
 await rm(raw,{recursive:true,force:true});
}
async function start(args,cwd,env,name){
 const log=await open(`reports/web/${name}.log`,'w');logs.push(log);
 const child=spawn(process.execPath,args,{cwd,env:{...process.env,...env},stdio:['ignore',log.fd,log.fd],windowsHide:true});
 child.on('error',error=>{console.error(error.message);});children.push(child);return child;
}
async function ready(url,child){
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw new Error(`Servidor de teste encerrou com código ${child.exitCode}.`);
  try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}
  await pause(200);
 }
 throw new Error(`Servidor de teste não respondeu: ${url}`);
}
try{
 const api=await start(['test/preview-server.mjs'],backend,{E2E_TEST_SERVER:'1',E2E_PORT:String(apiPort),E2E_APP_ORIGIN:base},'api');
 await ready(`http://127.0.0.1:${apiPort}/api/health`,api);
 const web=await start(['dist/espertinho/server/server.mjs'],process.cwd(),{PORT:String(webPort),HOST:'127.0.0.1',API_BASE_URL:`http://127.0.0.1:${apiPort}`,ALLOWED_HOSTS:'localhost,127.0.0.1'},'ssr');
 await ready(`http://127.0.0.1:${webPort}/health`,web);
 const tests=spawn(process.execPath,['node_modules/playwright/cli.js','test',...(process.env.E2E_SPEC?[process.env.E2E_SPEC]:[])],{env:{...process.env,E2E_BASE_URL:base,E2E_BROWSER_CHANNEL:process.env.E2E_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium')},stdio:'inherit',windowsHide:true});
 process.exitCode=await new Promise((done,reject)=>{tests.once('error',reject);tests.once('exit',code=>done(code??1));});
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
 await Promise.all(children.map(child=>child.exitCode===null?new Promise(done=>child.once('exit',done)):Promise.resolve()));
 for(const log of logs)await log.close();
}
