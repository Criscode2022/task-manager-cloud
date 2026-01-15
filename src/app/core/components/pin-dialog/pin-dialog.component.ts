import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  imports: [IonButton, IonIcon, MatTooltipModule, CommonModule],
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent {
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PinDialogComponent>);

  protected readonly pin = this.dialogData?.pin;
  protected copied = false;

  protected async copyPin(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pin);
      this.copied = true;
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
