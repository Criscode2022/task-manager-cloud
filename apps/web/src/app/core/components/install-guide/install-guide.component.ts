import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { InstallService } from '../../services/install.service';

/** iOS and iPadOS install web apps only from the Share menu; this walks through it. */
@Component({
  selector: 'app-install-guide',
  templateUrl: './install-guide.component.html',
  styleUrls: ['./install-guide.component.scss'],
  imports: [IonicModule, TranslateModule, MatDialogTitle, NgOptimizedImage],
})
export class InstallGuideComponent {
  private readonly dialogRef = inject(MatDialogRef<InstallGuideComponent>);
  private readonly installService = inject(InstallService);

  protected close(): void {
    this.dialogRef.close();
  }

  protected hideInstallButton(): void {
    this.installService.hideInstallButton();
    this.dialogRef.close();
  }
}
