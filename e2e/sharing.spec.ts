import {test,expect} from './coverage';

for(const width of [1320,390])test(`compartilhar oferta usa permalink, texto configurado e logos — ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).__copied=text;}}});});
 const products=await (await page.request.get('/api/products')).json();const details=await (await page.request.get('/api/products/'+products.items[0].id)).json();const offer=details.offers[0];
 await page.goto('/oferta/'+offer.id);await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',offer.title+' | O Espertinho');const trigger=page.locator('.detail-copy offer-share button');await expect(trigger).toBeVisible();await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Compartilhar oferta'}),networks=dialog.getByRole('group',{name:'Redes sociais'});
 await expect(networks.getByRole('button')).toHaveText(['WhatsApp','Telegram','Facebook','X','LinkedIn','Instagram']);await expect(networks.locator('social-logo img')).toHaveCount(6);
 const permalink=new URL('/oferta/'+offer.id,page.url()).href;
 const whats=dialog.getByRole('link',{name:'Abrir WhatsApp'});const target=new URL((await whats.getAttribute('href'))!);
 expect(target.origin).toBe('https://wa.me');expect(target.searchParams.get('text')).toContain(permalink);expect(target.searchParams.get('text')).toContain(offer.title);expect(target.searchParams.get('text')).not.toContain(offer.affiliate_url);
 await dialog.getByRole('button',{name:'Copiar link',exact:true}).click();expect(await page.evaluate(()=>(window as any).__copied)).toBe(permalink);
 await networks.getByRole('button',{name:'Telegram',exact:true}).click();const telegram=new URL((await dialog.getByRole('link',{name:'Abrir Telegram'}).getAttribute('href'))!);expect(telegram.searchParams.get('url')).toBe(permalink);
 await networks.getByRole('button',{name:'Instagram',exact:true}).click();await expect(dialog.getByRole('link',{name:/Abrir/})).toHaveCount(0);await dialog.getByRole('button',{name:'Copiar texto',exact:true}).click();expect(await page.evaluate(()=>(window as any).__copied)).toContain(offer.title);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/sharing-${width}.png`,fullPage:true});
 await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.goto('/produto/'+offer.product_id);await expect(page.locator('.detail-copy offer-share button')).toBeVisible();await expect(page.locator('offer-card offer-share button').first()).toBeVisible();
});

test('admin configura redes, textos e desativa compartilhamento',async({page})=>{
 await page.addInitScript(()=>{(window as any).google={accounts:{id:{initialize(o:any){(window as any).__shareLogin=o.callback;},renderButton(el:HTMLElement){const b=document.createElement('button');b.textContent='Entrar para compartilhar';b.onclick=()=>(window as any).__shareLogin({credential:'admin'});el.appendChild(b);}}}};});
 await page.goto('/entrar');await page.getByRole('button',{name:'Entrar para compartilhar'}).click();await expect(page).not.toHaveURL(/entrar/);
 const initial=await (await page.request.get('/api/admin/sharing')).json();
 try{
 await page.goto('/admin/links');await page.getByRole('navigation',{name:'Configurações de ofertas'}).getByRole('link',{name:'Compartilhamento'}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Compartilhamento de ofertas');const row=page.locator('sharing-admin tr').filter({hasText:'WhatsApp'});
 await row.getByRole('button',{name:'Ações de WhatsApp'}).click();await row.getByRole('button',{name:'Editar',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Texto padrão',{exact:true}).fill('Achado especial: {titulo}, {preco}, {loja}. {url}');await dialog.getByRole('button',{name:'Salvar rede'}).click();await expect(dialog).toHaveCount(0);
 expect((await (await page.request.get('/api/sharing')).json()).channels[0].textTemplate).toContain('Achado especial');
 const telegram=page.locator('sharing-admin tr').filter({hasText:'Telegram'});await telegram.getByRole('button',{name:'Ações de Telegram'}).click();await telegram.getByRole('button',{name:'Desativar',exact:true}).click();await expect(telegram).toContainText('Desativada');expect((await (await page.request.get('/api/sharing')).json()).channels.some((c:any)=>c.id==='telegram')).toBe(false);
 await page.getByLabel('Habilitar compartilhamento de ofertas').uncheck();await page.getByRole('button',{name:'Salvar configurações',exact:true}).click();await expect.poll(async()=>await (await page.request.get('/api/sharing')).json()).toEqual({enabled:false,channels:[]});
 const products=await (await page.request.get('/api/products')).json();const details=await (await page.request.get('/api/products/'+products.items[0].id)).json();await page.goto('/oferta/'+details.offers[0].id);await expect(page.locator('offer-share button')).toHaveCount(0);
 }finally{
 await page.evaluate(async initial=>{const current=await (await fetch('/api/admin/sharing')).json();const csrf=decodeURIComponent(document.cookie.split('; ').find(v=>v.startsWith('XSRF-TOKEN='))!.split('=').slice(1).join('='));const r=await fetch('/api/admin/sharing',{method:'PUT',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':csrf},body:JSON.stringify({...initial,version:current.version})});if(!r.ok)throw new Error(await r.text());},initial);
 }
});
