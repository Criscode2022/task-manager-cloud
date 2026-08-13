import { signal } from '@angular/core';
import { form, maxLength, required } from '@angular/forms/signals';
import { DEFAULT_TASK_PRIORITY, TaskPriority } from './types/task';

export type TaskFormModel = {
  title: string;
  description: string;
  priority: TaskPriority;
  tagsInput: string;
};

const emptyTaskForm = (): TaskFormModel => ({
  title: '',
  description: '',
  priority: DEFAULT_TASK_PRIORITY,
  tagsInput: '',
});

export class TaskForm {
  protected readonly taskModel = signal<TaskFormModel>(emptyTaskForm());

  protected readonly form = form(this.taskModel, (fields) => {
    required(fields.title, { message: 'Required' });
    maxLength(fields.title, 40);
    maxLength(fields.description, 30);
    required(fields.priority);
    maxLength(fields.tagsInput, 80);
  });

  protected clear(field: keyof TaskFormModel): void {
    this.taskModel.update((model) => ({
      ...model,
      [field]: field === 'priority' ? DEFAULT_TASK_PRIORITY : '',
    }));
  }

  protected resetTaskForm(): void {
    this.taskModel.set(emptyTaskForm());
  }

  protected hasUnsavedCreateChanges(): boolean {
    const model = this.taskModel();
    return (
      model.title.trim().length > 0 ||
      model.description.trim().length > 0 ||
      model.tagsInput.trim().length > 0 ||
      model.priority !== DEFAULT_TASK_PRIORITY
    );
  }
}
