// Scraped currency symbols, integer parts and cents may arrive from separate DOM nodes.
// Label adjacent prices only when they match this offer's known original/current prices.
export function formatOfferConditions(value:string,priceCents:number,originalPriceCents:number|null):string {
 let text=value.replace(/\s+/g,' ').trim().replace(/R\s*\$\s*(\d+(?:\s*\.\s*\d{3})*)(?:\s*,\s*(\d{2})(?!\d))?/gi,(_all,whole:string,cents:string|undefined)=>'R$ '+whole.replace(/\s/g,'')+(cents!==undefined?','+cents:''));
 text=text.replace(/(\d)\s+%/g,'$1%');
 const prefix=text.match(/^R\$ (\d+(?:\.\d{3})*(?:,\d{2})?)\s+R\$ (\d+(?:\.\d{3})*(?:,\d{2})?)(?=\s|$)/);
 const cents=(amount:string)=>Math.round(Number(amount.replaceAll('.','').replace(',','.'))*100);
 if(prefix&&originalPriceCents!==null&&originalPriceCents>priceCents&&cents(prefix[1])===originalPriceCents&&cents(prefix[2])===priceCents){
  const rest=text.slice(prefix[0].length).trim();text='De R$ '+prefix[1]+' por R$ '+prefix[2]+(rest?' · '+rest:'');
 }
 return text;
}
