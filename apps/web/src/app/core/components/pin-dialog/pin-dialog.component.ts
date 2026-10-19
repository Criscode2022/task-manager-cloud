import { Component, computed, inject, signal } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

const PIN_GROUP_SIZE = 4;

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  imports: [IonicModule, TranslateModule, MatDialogTitle],
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent {
  private readonly dialogData = inject<{ pin: string }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PinDialogComponent>);

  protected readonly pin = String(this.dialogData?.pin ?? '');
  protected readonly copied = signal(false);
  protected readonly confirmed = signal(false);

  /** "12345678" reads as "1234 5678": two groups are easier to copy by hand. */
  protected readonly pinGroups = computed(() => [
    this.pin.slice(0, PIN_GROUP_SIZE),
    this.pin.slice(PIN_GROUP_SIZE),
  ]);

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
