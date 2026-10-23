import type {Locator} from '@playwright/test';

export async function chooseAction(scope:Locator,name:string){
 const action=scope.getByRole('button',{name,exact:true});
 await scope.locator('app-action-menu > button').click();
 await action.click();
}
