import {Seo} from '../seo.service';
import {Component,inject} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {legalInformation} from '../legal-information';
@Component({imports:[RouterLink],templateUrl:'./legal.page.html'})
export class LegalPage{
 view=inject(ActivatedRoute).snapshot.data['view'];info=legalInformation;
 constructor(){
  const seo=inject(Seo),pages:Record<string,{title:string;path:string;description:string}>={
   about:{title:'Sobre o Espertinho',path:'/sobre',description:'Conheça o Espertinho, como funciona a comparação de preços e o acompanhamento de ofertas nas lojas monitoradas.'},
   privacy:{title:'Política de Privacidade',path:'/privacidade',description:'Saiba como o Espertinho trata dados pessoais, cookies e suas preferências de privacidade.'},
   terms:{title:'Termos de Uso',path:'/termos',description:'Consulte as condições de uso do Espertinho e as informações sobre preços, ofertas e lojas parceiras.'}
  };
  const page=pages[this.view];
  if(page)seo.set({...page,title:page.title+' | O Espertinho'});else seo.failure(404);
 }
}
