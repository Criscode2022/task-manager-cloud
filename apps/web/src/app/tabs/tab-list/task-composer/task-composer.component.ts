import { Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SegmentedControlComponent } from '../../../core/components/segmented-control/segmented-control.component';
import { TagFieldComponent } from '../../../core/components/tag-field/tag-field.component';
import { PRIORITY_OPTIONS } from '../priority-options';
import { TaskForm } from '../task.form';
import { parseTags, TaskDraft, TITLE_MAX_LENGTH } from '../types/task';

/** The capture field: a title and Add, with note, priority, and tags once you start writing. */
@Component({
  selector: 'app-task-composer',
  templateUrl: './task-composer.component.html',
  styleUrl: './task-composer.component.scss',
  imports: [IonicModule, TranslateModule, FormField, SegmentedControlComponent, TagFieldComponent],
  host: {
    '(keydown.escape)': 'requestDiscard()',
  },
})
export class TaskComposerComponent extends TaskForm {
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  /** Tags already used on other tasks, offered as suggestions. */
  readonly knownTags = input<readonly string[]>([]);
  readonly create = output<TaskDraft>();

  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');

  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly isExpanded = computed(() => this.hasUnsavedCreateChanges());
  protected readonly titleLength = computed(() => this.taskModel().title.length);
  protected readonly canSubmit = computed(
    () => this.form().valid() && this.taskModel().title.trim().length > 0,
  );

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    const model = this.taskModel();
    this.create.emit({
      title: model.title.trim(),
      description: model.description.trim(),
      priority: model.priority,
      tags: parseTags(model.tagsInput),
    });

    this.resetTaskForm();
    this.titleInput().nativeElement.focus();
  }

  protected async requestDiscard(): Promise<void> {
    if (!this.hasUnsavedCreateChanges()) {
      this.titleInput().nativeElement.blur();
      return;
    }

    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.UNSAVED_CHANGES_TITLE'),
      message: this.translate.instant('TASKS.UNSAVED_CHANGES_MESSAGE'),
      buttons: [
        { text: this.translate.instant('TASKS.KEEP_EDITING'), role: 'cancel' },
        {
          text: this.translate.instant('TASKS.DISCARD_CHANGES'),
          role: 'destructive',
          handler: () => this.resetTaskForm(),
        },
      ],
    });
    await alert.present();
  }
}
