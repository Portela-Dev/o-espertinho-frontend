import {test,expect} from './coverage';

test('institutional pages publish only the service contact address',async({page})=>{
 for(const path of ['/sobre','/privacidade','/termos']){
  await page.goto(path);
  const contact=page.getByRole('region',{name:'Responsável e canais de atendimento'});
  await expect(contact.getByRole('link',{name:'contato@oespertinho.com',exact:true})).toHaveAttribute('href','mailto:contato@oespertinho.com');
  await expect(page.locator('article')).not.toContainText(/@gmail\.com|Arnaldo|Portela/i);
 }
});
