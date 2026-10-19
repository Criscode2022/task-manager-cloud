import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SegmentedControlComponent } from '../../../core/components/segmented-control/segmented-control.component';
import { TagFieldComponent } from '../../../core/components/tag-field/tag-field.component';
import { PRIORITY_OPTIONS } from '../priority-options';
import {
  DEFAULT_TASK_PRIORITY,
  DESCRIPTION_MAX_LENGTH,
  parseTags,
  TAGS_INPUT_MAX_LENGTH,
  Task,
  TaskDraft,
  TITLE_MAX_LENGTH,
} from '../types/task';

/** Edits a task in place, inside its row. */
@Component({
  selector: 'app-task-editor',
  templateUrl: './task-editor.component.html',
  styleUrl: './task-editor.component.scss',
  imports: [IonicModule, TranslateModule, FormField, SegmentedControlComponent, TagFieldComponent],
  host: {
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class TaskEditorComponent {
  readonly task = input.required<Task>();
  /** Tags already used on other tasks, offered as suggestions. */
  readonly knownTags = input<readonly string[]>([]);

  readonly save = output<TaskDraft>();
  readonly dismiss = output<void>();
  readonly remove = output<void>();

  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');

  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly draft = linkedSignal(() => {
    const task = this.task();
    return {
      title: task.title,
      description: task.description ?? '',
      priority: task.priority || DEFAULT_TASK_PRIORITY,
      tags: task.tags?.join(', ') ?? '',
    };
  });

  protected readonly form = form(this.draft, (fields) => {
    required(fields.title, { message: 'Required' });
    maxLength(fields.title, TITLE_MAX_LENGTH);
    maxLength(fields.description, DESCRIPTION_MAX_LENGTH);
    required(fields.priority);
    maxLength(fields.tags, TAGS_INPUT_MAX_LENGTH);
  });

  constructor() {
    afterNextRender(() => {
      const field = this.titleInput().nativeElement;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    });
  }

  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.form, async () => {
      const draft = this.draft();
      if (!draft.title.trim()) {
        return undefined;
      }

      this.save.emit({
        title: draft.title.trim(),
        description: draft.description.trim(),
        priority: draft.priority,
        tags: parseTags(draft.tags),
      });
      return undefined;
    });
  }

  protected onEscape(event: Event): void {
    event.stopPropagation();
    this.dismiss.emit();
  }
}
