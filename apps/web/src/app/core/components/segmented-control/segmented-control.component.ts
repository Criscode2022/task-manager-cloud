import { Component, computed, ElementRef, input, model, viewChildren } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

export type SegmentTone = 'high' | 'medium' | 'low';

export type SegmentOption<T> = {
  value: T;
  labelKey: string;
  count?: number;
  icon?: string;
  /** Priority options take their hue instead of the ink. */
  tone?: SegmentTone;
};

/**
 * A single-choice radio group drawn as a track with a sliding selection.
 * Works with `[(value)]` or a Signal Forms `[formField]`.
 */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.component.html',
  styleUrl: './segmented-control.component.scss',
  imports: [IonicModule, TranslateModule],
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '[style.--segment-count]': 'options().length',
    '[style.--segment-index]': 'selectedIndex()',
    '[attr.data-tone]': 'selectedTone()',
  },
})
export class SegmentedControlComponent<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly label = input.required<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('segment');

  protected readonly selectedIndex = computed(() =>
    Math.max(
      0,
      this.options().findIndex((option) => option.value === this.value()),
    ),
  );

  protected readonly selectedTone = computed(
    () => this.options()[this.selectedIndex()]?.tone ?? null,
  );

  protected select(option: SegmentOption<T>): void {
    this.value.set(option.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const nextIndex = this.indexForKey(event.key);
    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    this.value.set(this.options()[nextIndex].value);
    this.buttons()[nextIndex]?.nativeElement.focus();
  }

  private indexForKey(key: string): number | null {
    const last = this.options().length - 1;
    const current = this.selectedIndex();

    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        return current === last ? 0 : current + 1;
      case 'ArrowLeft':
      case 'ArrowUp':
        return current === 0 ? last : current - 1;
      case 'Home':
        return 0;
      case 'End':
        return last;
      default:
        return null;
    }
  }
}
