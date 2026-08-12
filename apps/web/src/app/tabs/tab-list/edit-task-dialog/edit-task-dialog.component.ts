import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
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

type EditTaskFormModel = {
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
    FormField,
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

  protected readonly priorityOptions: {
    value: TaskPriority;
    labelKey: string;
  }[] = [
    { value: 'high', labelKey: 'TASKS.PRIORITY.HIGH' },
    { value: 'medium', labelKey: 'TASKS.PRIORITY.MEDIUM' },
    { value: 'low', labelKey: 'TASKS.PRIORITY.LOW' },
  ];

  protected readonly editModel = signal<EditTaskFormModel>({
    title: this.dialogData.title,
    description: this.dialogData.description ?? '',
    priority: this.dialogData.priority || DEFAULT_TASK_PRIORITY,
    tags: this.dialogData.tags?.join(', ') ?? '',
  });

  protected readonly form = form(this.editModel, (fields) => {
    required(fields.title, { message: 'Required' });
    maxLength(fields.title, 40);
    maxLength(fields.description, 30);
    required(fields.priority);
    maxLength(fields.tags, 80);
  });

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected async confirm(event?: Event): Promise<void> {
    event?.preventDefault();

    await submit(this.form, async () => {
      const value = this.editModel();
      this.dialogRef.close({
        title: value.title.trim(),
        description: value.description.trim(),
        priority: value.priority,
        tags: value.tags,
      });
      return undefined;
    });
  }
}
