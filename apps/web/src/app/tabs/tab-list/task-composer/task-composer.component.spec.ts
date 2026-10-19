import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TaskDraft } from '../types/task';
import { TaskComposerComponent } from './task-composer.component';

describe('TaskComposerComponent', () => {
  let fixture: ComponentFixture<TaskComposerComponent>;
  let component: TaskComposerComponent;
  let drafts: TaskDraft[];

  const titleInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('.composer-title');
  const form = (): HTMLFormElement => fixture.nativeElement.querySelector('form.task-form');

  const type = (value: string): void => {
    titleInput().value = value;
    titleInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), TaskComposerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskComposerComponent);
    component = fixture.componentInstance;
    drafts = [];
    component.create.subscribe((draft) => drafts.push(draft));
    fixture.detectChanges();
  });

  it('keeps the details folded until something is written', () => {
    expect(form().classList).not.toContain('is-expanded');

    type('Buy milk');

    expect(form().classList).toContain('is-expanded');
  });

  it('does not add a blank title', () => {
    type('   ');
    form().requestSubmit();

    expect(drafts).toEqual([]);
  });

  it('hands back a trimmed draft with parsed tags', () => {
    type('  Buy milk ');
    component['taskModel'].update((model) => ({
      ...model,
      priority: 'high',
      tagsInput: 'Shopping, home,',
    }));
    fixture.detectChanges();

    form().requestSubmit();

    expect(drafts).toEqual([
      { title: 'Buy milk', description: '', priority: 'high', tags: ['shopping', 'home'] },
    ]);
  });

  it('clears and folds after adding, leaving the field ready for the next task', () => {
    titleInput().focus();
    type('Buy milk');

    form().requestSubmit();
    fixture.detectChanges();

    expect(titleInput().value).toBe('');
    expect(form().classList).not.toContain('is-expanded');
    expect(document.activeElement).toBe(titleInput());
  });
});
