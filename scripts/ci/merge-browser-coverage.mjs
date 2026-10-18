import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import v8toIstanbul from 'v8-to-istanbul';
import coverage from 'istanbul-lib-coverage';
import report from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const root=process.cwd(),browser=resolve('dist/espertinho/browser');
const map=coverage.createCoverageMap(JSON.parse(await readFile('coverage/coverage-final.json','utf8')));
const raw=await readdir('coverage/browser-raw');
let converted=0;
function projectSource(filename){
 const path=relative(root,filename).split(sep).join('/');
 return path.startsWith('src/')||path.startsWith('scripts/');
}
for(const filename of raw){
 const entries=JSON.parse(await readFile(resolve('coverage/browser-raw',filename),'utf8'));
 for(const entry of entries){
  if(!/^https?:/.test(entry.url)||!entry.source)continue;
  const pathname=new URL(entry.url).pathname;
  if(!pathname.endsWith('.js'))continue;
  const script=resolve(browser,'.'+pathname);
  if(!script.startsWith(browser+sep))throw new Error('Caminho de cobertura fora do build.');
  let sourceMap;
  try{sourceMap=JSON.parse(await readFile(script+'.map','utf8'));}
  catch(error){if(error.code==='ENOENT')continue;throw error;}
  sourceMap.sources=sourceMap.sources.map(source=>{
   const path=source.replace(/^(\.\.\/)+/,'');
   return /^(src|node_modules)\//.test(path)?resolve(root,path):source;
  });
  const converter=v8toIstanbul(script,0,{source:entry.source,sourceMap:{sourcemap:sourceMap}},file=>!projectSource(file));
  await converter.load();converter.applyCoverage(entry.functions);
  map.merge(converter.toIstanbul());converted++;
 }
}
if(!converted)throw new Error('Nenhuma cobertura de navegador com source map foi coletada.');
const context=report.createContext({dir:'coverage',coverageMap:map});
for(const reporter of ['lcovonly','json','text-summary'])reports.create(reporter).execute(context);
console.log(`Cobertura de ${converted} scripts de navegador mesclada aos testes Node.`);
