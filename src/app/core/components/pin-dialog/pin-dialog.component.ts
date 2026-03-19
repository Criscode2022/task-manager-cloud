import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IonButton, IonCheckbox, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  imports: [
    IonButton,
    IonIcon,
    IonCheckbox,
    MatTooltipModule,
    CommonModule,
    FormsModule,
    TranslateModule,
  ],
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent {
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PinDialogComponent>);

  protected readonly pin = this.dialogData?.pin;
  protected copied = false;
  protected confirmed = false;

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
