import {Component,inject} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {legalInformation} from '../legal-information';
@Component({imports:[RouterLink],templateUrl:'./legal.page.html'})
export class LegalPage{
 view=inject(ActivatedRoute).snapshot.data['view'];info=legalInformation;
 constructor(){inject(Title).setTitle((({about:'Sobre o Espertinho',privacy:'Política de Privacidade',terms:'Termos de Uso'} as Record<string,string>)[this.view]||'Página não encontrada')+' | O Espertinho');}
}
