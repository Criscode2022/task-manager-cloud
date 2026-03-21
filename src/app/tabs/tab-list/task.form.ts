import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DEFAULT_TASK_PRIORITY } from './types/task';

export class TaskForm {
  private fb = inject(FormBuilder);

  private skeleton = {
    title: ['', [Validators.required, Validators.maxLength(40)]],
    description: ['', [Validators.maxLength(30)]],
    priority: [DEFAULT_TASK_PRIORITY, [Validators.required]],
    tagsInput: ['', [Validators.maxLength(80)]],
  };

  protected form = this.fb.group(this.skeleton);

  get description() {
    return this.form.get('description');
  }

  get priority() {
    return this.form.get('priority');
  }

  get tagsInput() {
    return this.form.get('tagsInput');
  }

  get title() {
    return this.form.get('title');
  }

  protected clear(element: string): void {
    this.form.get(element)?.reset();
  }
}
