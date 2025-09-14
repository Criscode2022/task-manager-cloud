import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  imports: [IonButton],
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent {
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PinDialogComponent>);

  protected readonly pin = this.dialogData?.pin;

  protected close(): void {
    this.dialogRef.close();
  }
}
