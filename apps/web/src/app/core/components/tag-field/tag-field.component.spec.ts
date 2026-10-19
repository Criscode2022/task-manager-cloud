import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TagFieldComponent } from './tag-field.component';

@Component({
  imports: [TagFieldComponent],
  template: `<app-tag-field [(value)]="tags" [knownTags]="known" />`,
})
class HostComponent {
  readonly tags = signal('');
  readonly known = ['health', 'home', 'work'];
}

describe('TagFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const suggestionLabels = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.tag-suggestion')).map(
      (chip) => chip.textContent?.trim() ?? '',
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('offers every known tag while the field is empty', () => {
    expect(suggestionLabels()).toEqual(['#health', '#home', '#work']);
  });

  it('narrows suggestions to the tag being typed and hides ones already written', () => {
    fixture.componentInstance.tags.set('work, h');
    fixture.detectChanges();

    expect(suggestionLabels()).toEqual(['#health', '#home']);
  });

  it('does not suggest the tag that is already typed in full', () => {
    fixture.componentInstance.tags.set('health');
    fixture.detectChanges();

    expect(suggestionLabels()).toEqual([]);
  });

  it('adds a suggestion after the written tags, ready for the next one', () => {
    fixture.componentInstance.tags.set('work, ho');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.tag-suggestion') as HTMLButtonElement).click();

    expect(fixture.componentInstance.tags()).toBe('work, home, ');
  });
});
