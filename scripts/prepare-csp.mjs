import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const script=await readFile(require.resolve('@angular/core/event-dispatch-contract.min.js'),'utf8');
const hash='sha256-'+createHash('sha256').update(script).digest('base64');
await writeFile(new URL('../src/angular-bootstrap-csp.ts',import.meta.url),'// Generated from the locked Angular event-dispatch script by scripts/prepare-csp.mjs.\nexport const angularBootstrapHash='+JSON.stringify(hash)+';\n');
