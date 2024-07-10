import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'list',
        loadChildren: () =>
          import('../tab-list/tab-list.module').then(
            (m) => m.TabListPageModule
          ),
      },
      {
        path: 'tab-options',
        loadChildren: () =>
          import('../tab-options/tab-options.module').then(
            (m) => m.TabOptionsPageModule
          ),
      },

      {
        path: '',
        redirectTo: '/tabs/list',
        pathMatch: 'full',
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
