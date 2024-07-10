import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabOptionsPage } from './tab-options.page';

const routes: Routes = [
  {
    path: '',
    component: TabOptionsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabOptionsPageRoutingModule {}
