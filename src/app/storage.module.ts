import { NgModule } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage-angular';

@NgModule({
  imports: [IonicStorageModule.forRoot()],
  exports: [IonicStorageModule],
})
export class StorageModule {}
