import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabListPage } from './tab-list/tab-list.page';
import { TabOptionsPage } from './tab-options/tab-options.page';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: '',
        redirectTo: '/tabs/list',
        pathMatch: 'full',
      },
      {
        path: 'list',
        component: TabListPage,
      },
      {
        path: 'options',
        component: TabOptionsPage,
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/list',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
