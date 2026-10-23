import {Injectable,inject,signal} from '@angular/core';
import {Api} from './api.service';
import {Offer} from './models';
export interface SharingChannel{id:string;name:string;enabled:boolean;logoUrl:string;action:'url'|'copy';urlTemplate:string;textTemplate:string}
export interface SharingSettings{enabled:boolean;channels:SharingChannel[];version?:number}
export function shareText(channel:SharingChannel,offer:Offer,url:string){
 const values:Record<string,string>={titulo:offer.title,preco:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(offer.price_cents/100),loja:offer.marketplace_name||offer.marketplace_id,url};
 return channel.textTemplate.replace(/\{([^{}]+)\}/g,(token,key)=>values[key]??token);
}
export function shareDestination(channel:SharingChannel,offer:Offer,url:string,text:string){
 const values:Record<string,string>={titulo:offer.title,preco:(offer.price_cents/100).toFixed(2),loja:offer.marketplace_name||offer.marketplace_id,url,texto:text};
 const value=channel.urlTemplate.replace(/\{([^{}]+)\}/g,(token,key)=>encodeURIComponent(values[key]??token));
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
@Injectable({providedIn:'root'})
export class Sharing{
 private api=inject(Api);settings=signal<SharingSettings|null>(null);private pending?:Promise<void>;
 load(){return this.pending??=this.api.get<SharingSettings>('/sharing').then(data=>{this.settings.set(data);}).catch(()=>{this.pending=undefined;});}
 invalidate(){this.settings.set(null);this.pending=undefined;void this.load();}
}
