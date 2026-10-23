export interface User {id:string;email:string;name:string;avatar:string|null;role:'user'|'admin';access_profile_id?:string;permissions?:string[]}
export interface Offer {rating?:number|null;review_count?:number|null;product_name?:string;product_sku?:string;availability_status?:'available'|'unavailable';refresh_status?:'updated'|'pending';data_updated_at?:string;last_refresh_attempt_at?:string|null;last_refresh_error?:string|null;product_id:string;seller_name?:string;marketplace_name?:string;marketplace_logo_url?:string;images?:string[];specifications?:{name:string;value:string}[];extraction_metadata?:any;id:string;marketplace_id:string;external_id:string;title:string;description:string;category:string;subcategory?:string;category_path?:string[];category_ids?:string[];image_url:string|null;product_url:string;affiliate_url:string|null;price_cents:number;original_price_cents:number|null;status:string;source:string;conditions:string;featured:boolean;verified_at:string;expires_at:string;published_at:string;updated_at:string}
export interface CategoryNode {id:string;path:string[];depth:number}
export interface Filters {categoryId?:string;q:string;marketplace:string;category:string;maxPrice:number;sort:string}
export interface Collection {id:string;name:string;description:string;item_count:number;items?:Offer[]}
export interface SavedFilter {id:string;name:string;filters:Filters}
export const storeNames:Record<string,string>={amazon:'Amazon',mercadolivre:'Mercado Livre'};
export const emptyFilters=():Filters=>({q:'',marketplace:'',category:'',categoryId:'',maxPrice:0,sort:'recent'});

export interface Product {marketplaces?:MarketplaceSummary[];rating?:number|null;review_count?:number|null;rating_marketplace_name?:string|null;id:string;name:string;description:string;brand:string;model:string;category:string;subcategory:string;category_path:string[];category_ids:string[];image_url:string|null;display_image_url:string|null;min_price_cents:number|null;max_price_cents:number|null;offer_count:number;available?:boolean;status?:string;offers?:Offer[];updated_at:string}

export interface MarketplaceSummary {id:string;name:string;website_url:string;logo_url:string}
