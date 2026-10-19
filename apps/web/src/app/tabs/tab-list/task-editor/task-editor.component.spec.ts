import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Task, TaskDraft } from '../types/task';
import { TaskEditorComponent } from './task-editor.component';

describe('TaskEditorComponent', () => {
  let fixture: ComponentFixture<TaskEditorComponent>;
  let saved: TaskDraft[];
  let cancelled: number;

  const task: Task = {
    id: 7,
    title: 'Book the dentist',
    description: 'Ask about Friday',
    done: false,
    priority: 'high',
    tags: ['health'],
    created_at: new Date(0),
    user_id: 0,
  };

  const field = (selector: string): HTMLInputElement =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), TaskEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskEditorComponent);
    fixture.componentRef.setInput('task', task);
    saved = [];
    cancelled = 0;
    fixture.componentInstance.save.subscribe((draft) => saved.push(draft));
    fixture.componentInstance.dismiss.subscribe(() => cancelled++);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('starts from the task and focuses its title', () => {
    expect(field('.editor-title').value).toBe('Book the dentist');
    expect(field('.editor-note').value).toBe('Ask about Friday');
    expect(document.activeElement).toBe(field('.editor-title'));
  });

  it('saves the edited fields as a draft', async () => {
    field('.editor-title').value = 'Book the dentist again ';
    field('.editor-title').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).requestSubmit();
    await fixture.whenStable();

    expect(saved).toEqual([
      {
        title: 'Book the dentist again',
        description: 'Ask about Friday',
        priority: 'high',
        tags: ['health'],
      },
    ]);
  });

  it('dismisses on Escape', () => {
    field('.editor-title').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(cancelled).toBe(1);
  });
});
