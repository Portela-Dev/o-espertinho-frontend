import {InjectionToken} from '@angular/core';
// Only the server bootstrap overrides this token. Browsers keep same-origin /api URLs.
export const API_ORIGIN=new InjectionToken<string>('API_ORIGIN',{providedIn:'root',factory:()=>'http://127.0.0.1:3000'});
