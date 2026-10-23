import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiOrigin} from '../src/server-config.ts';
test('origem interna aceita DNS do Compose e normaliza barra final',()=>{
 assert.equal(apiOrigin('http://espertinho-backend:3000/'),'http://espertinho-backend:3000');
 assert.equal(apiOrigin('https://api.example.com'),'https://api.example.com');
});
test('origem interna não aceita caminhos, credenciais ou protocolos arbitrários',()=>{
 for(const value of ['file:///etc/passwd','http://user:secret@api.example.com','http://api.example.com/api','http://api.example.com?token=1','http://api.example.com#x','invalid'])assert.throws(()=>apiOrigin(value));
});
