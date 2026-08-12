
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { DEFAULT_TASK_PRIORITY, Task, TaskPriority } from '../types/task';

export type EditTaskDialogResult = {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string;
};

@Component({
  selector: 'app-edit-task-dialog',
  templateUrl: './edit-task-dialog.component.html',
  styleUrls: ['./edit-task-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    IonicModule,
    TranslateModule,
  ],
})
export class EditTaskDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<EditTaskDialogComponent, EditTaskDialogResult | undefined>,
  );
  private readonly dialogData = inject<Task>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly priorityOptions: {
    value: TaskPriority;
    labelKey: string;
  }[] = [
    { value: 'high', labelKey: 'TASKS.PRIORITY.HIGH' },
    { value: 'medium', labelKey: 'TASKS.PRIORITY.MEDIUM' },
    { value: 'low', labelKey: 'TASKS.PRIORITY.LOW' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    title: [
      this.dialogData.title,
      [Validators.required, Validators.maxLength(40)],
    ],
    description: [
      this.dialogData.description ?? '',
      [Validators.maxLength(30)],
    ],
    priority: [
      this.dialogData.priority || DEFAULT_TASK_PRIORITY,
      [Validators.required],
    ],
    tags: [this.dialogData.tags?.join(', ') ?? ''],
  });

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      title: value.title.trim(),
      description: value.description.trim(),
      priority: value.priority,
      tags: value.tags,
    });
  }
}
