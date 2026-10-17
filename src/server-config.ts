export function apiOrigin(value=process.env['API_BASE_URL']||'http://127.0.0.1:3000'){
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('API_BASE_URL deve ser uma origem HTTP(S), sem caminho ou credenciais.');
 return url.origin;
}
