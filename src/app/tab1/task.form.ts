import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

export class TaskForm {
  private fb = inject(FormBuilder);

  private skeleton = {
    title: ['', [Validators.required, Validators.maxLength(40)]],
    description: ['', [Validators.required, Validators.maxLength(30)]],
  };

  get title() {
    return this.form.get('title');
  }

  get description() {
    return this.form.get('description');
  }

  protected form = this.fb.group(this.skeleton);
}
