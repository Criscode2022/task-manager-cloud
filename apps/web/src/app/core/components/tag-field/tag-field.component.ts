import { Component, computed, ElementRef, input, model, output, viewChild } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MAX_TAGS, splitTagInput } from '../../../tabs/tab-list/types/task';

const MAX_SUGGESTIONS = 6;

/**
 * Comma-separated tags with the person's existing tags offered as chips.
 * Works with a Signal Forms `[formField]`.
 */
@Component({
  selector: 'app-tag-field',
  templateUrl: './tag-field.component.html',
  styleUrl: './tag-field.component.scss',
  imports: [IonicModule, TranslateModule],
})
export class TagFieldComponent implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly touched = input(false);
  readonly touch = output<void>();
  /** Set by the form field from its maxLength rule. */
  readonly maxLength = input<number | undefined>(undefined);

  /** Tags already used on other tasks. */
  readonly knownTags = input<readonly string[]>([]);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly suggestions = computed(() => {
    const { committedTags, currentToken } = splitTagInput(this.value());
    if (committedTags.length >= MAX_TAGS) {
      return [];
    }

    return this.knownTags()
      .filter((tag) => !committedTags.includes(tag) && tag !== currentToken)
      .filter((tag) => !currentToken || tag.includes(currentToken))
      .slice(0, MAX_SUGGESTIONS);
  });

  protected write(text: string): void {
    this.value.set(text);
  }

  protected addSuggestion(tag: string): void {
    const { committedTags } = splitTagInput(this.value());
    this.value.set(`${[...committedTags, tag].join(', ')}, `);
    this.field().nativeElement.focus();
  }

  protected clear(): void {
    this.value.set('');
    this.field().nativeElement.focus();
  }
}
