
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, MatTooltipModule, TranslateModule],
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent {
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PinDialogComponent>);

  protected readonly pin = this.dialogData?.pin;
  protected readonly copied = signal(false);
  protected readonly confirmed = signal(false);

  protected async copyPin(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pin);
      this.copied.set(true);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
