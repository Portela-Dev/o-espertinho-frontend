import {angularBootstrapHash} from './angular-bootstrap-csp.ts';
import {randomBytes} from 'node:crypto';
import type {RequestHandler} from 'express';
export const securityHeaders:RequestHandler=(_req,res,next)=>{
 const nonce=randomBytes(24).toString('base64');res.locals['cspNonce']=nonce;
 res.set({
  'Content-Security-Policy':`default-src 'self'; script-src 'self' 'nonce-${nonce}' '${angularBootstrapHash}' https://accounts.google.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy':'same-origin-allow-popups',
  ...(process.env['NODE_ENV']==='production'?{'Strict-Transport-Security':'max-age=31536000'}:{})
 });next();
};
