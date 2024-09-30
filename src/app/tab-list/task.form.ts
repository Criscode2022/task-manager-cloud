import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AlertMessages } from '../shared/types/alert-messages';

export class TaskForm extends AlertMessages {
  private fb = inject(FormBuilder);

  private skeleton = {
    title: ['', [Validators.required, Validators.maxLength(40)]],
    description: ['', [Validators.maxLength(30)]],
  };

  protected form = this.fb.group(this.skeleton);

  get title() {
    return this.form.get('title');
  }

  get description() {
    return this.form.get('description');
  }
}
