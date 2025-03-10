import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

export class TaskForm {
  private fb = inject(FormBuilder);

  private skeleton = {
    title: ['', [Validators.required, Validators.maxLength(40)]],
    description: ['', [Validators.maxLength(30)]],
  };

  protected form = this.fb.group(this.skeleton);

  get description() {
    return this.form.get('description');
  }

  get title() {
    return this.form.get('title');
  }

  protected clear(element: string): void {
    this.form.get(element)?.reset();
  }
}
