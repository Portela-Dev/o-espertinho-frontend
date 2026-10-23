import {test,expect} from './coverage';

test('busca automática espera 500 ms, reinicia a espera e cancela ao enviar ou sair',async({page})=>{
 const calls:string[]=[];
 await page.route('**/api/products?**',async route=>{
  const q=new URL(route.request().url()).searchParams.get('q')||'';calls.push(q);
  await route.fulfill({json:{items:[],total:0,page:1,pageSize:24}});
 });
 await page.goto('/sobre');await page.getByRole('link',{name:'Explorar',exact:true}).click();
 await expect.poll(()=>calls.length).toBe(1);calls.length=0;
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 const search=page.getByRole('textbox',{name:'Buscar ofertas'});
 await search.fill('Mon');await page.clock.runFor(400);expect(calls).toEqual([]);
 await search.fill('Monitor');await page.clock.runFor(499);expect(calls).toEqual([]);
 await page.clock.runFor(1);await expect.poll(()=>calls).toEqual(['Monitor']);
 await expect(page).toHaveURL(/q=Monitor/);
 await search.fill('Mouse');await search.press('Enter');await expect.poll(()=>calls).toEqual(['Monitor','Mouse']);
 await page.clock.runFor(600);expect(calls).toEqual(['Monitor','Mouse']);
 await search.fill('');await page.clock.runFor(500);await expect.poll(()=>calls).toEqual(['Monitor','Mouse','']);
 await search.fill('Teclado');await page.getByRole('link',{name:'Meus filtros salvos'}).click();
 await page.clock.runFor(600);expect(calls).toEqual(['Monitor','Mouse','']);
});
