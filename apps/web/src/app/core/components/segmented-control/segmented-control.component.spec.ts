import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import {
  SegmentedControlComponent,
  SegmentOption,
} from './segmented-control.component';

type Status = 'all' | 'pending' | 'done';

@Component({
  imports: [SegmentedControlComponent],
  template: `
    <app-segmented-control
      [options]="options"
      [(value)]="status"
      label="Status"
    />
  `,
})
class HostComponent {
  readonly status = signal<Status>('all');
  readonly options: SegmentOption<Status>[] = [
    { value: 'all', labelKey: 'All', count: 3 },
    { value: 'pending', labelKey: 'Pending', count: 2 },
    { value: 'done', labelKey: 'Done', count: 1 },
  ];
}

describe('SegmentedControlComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const radios = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="radio"]'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('exposes a labelled radio group with one checked option', () => {
    const group: HTMLElement = fixture.nativeElement.querySelector('[role="radiogroup"]');

    expect(group.getAttribute('aria-label')).toBe('Status');
    expect(radios().map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('keeps only the checked option in the tab order', () => {
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  });

  it('selects an option on click', () => {
    radios()[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('done');
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
  });

  it('moves the selection and focus with arrow keys, wrapping at the ends', () => {
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('done');
    expect(document.activeElement).toBe(radios()[2]);

    radios()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('all');
  });

  it('shows the count next to each label', () => {
    expect(radios()[1].textContent).toContain('2');
  });
});
