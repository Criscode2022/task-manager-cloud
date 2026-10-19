import { signal } from '@angular/core';
import { form, maxLength, required } from '@angular/forms/signals';
import {
  DEFAULT_TASK_PRIORITY,
  DESCRIPTION_MAX_LENGTH,
  TAGS_INPUT_MAX_LENGTH,
  TaskPriority,
  TITLE_MAX_LENGTH,
} from './types/task';

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
    maxLength(fields.title, TITLE_MAX_LENGTH);
    maxLength(fields.description, DESCRIPTION_MAX_LENGTH);
    required(fields.priority);
    maxLength(fields.tagsInput, TAGS_INPUT_MAX_LENGTH);
  });

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
