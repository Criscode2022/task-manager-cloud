import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TabOptionsPageRoutingModule } from './tab-options-routing.module';
import { TabOptionsPage } from './tab-options.page';

@NgModule({
  imports: [IonicModule, CommonModule, TabOptionsPageRoutingModule],
  declarations: [TabOptionsPage],
})
export class TabOptionsPageModule {}
