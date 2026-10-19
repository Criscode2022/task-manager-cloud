import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { LoadingService } from 'src/app/core/services/loading.service';
import { TaskNeonService } from 'src/app/core/services/task-neon.service';
import { TaskService } from 'src/app/core/services/task.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TabListPage } from './tab-list.page';
import { StatusEnum } from './types/statusEnum';
import { Task } from './types/task';

describe('TabListPage', () => {
  let component: TabListPage;
  let fixture: ComponentFixture<TabListPage>;
  let undoAction: Subject<void>;

  const makeTask = (overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
    description: '',
    tags: [],
    done: false,
    priority: 'medium',
    created_at: new Date(0),
    user_id: 0,
    ...overrides,
  });

  const taskServiceMock = {
    tasks: signal<Task[]>([]),
    filter: signal(StatusEnum.All),
    shouldShowInstall: signal(true),
    storageReady: signal(true),
    tasksHydrated: signal(true),
    userId: signal(0),
    saveTasks: jasmine.createSpy('saveTasks').and.resolveTo(),
    saveFilter: jasmine.createSpy('saveFilter').and.resolveTo(),
  };

  const userServiceMock = {
    createUser: jasmine.createSpy('createUser').and.resolveTo(),
    pinHash: signal<string | null>(null),
    accessToken: signal<string | null>(null),
  };

  const loadingServiceMock = {
    isLoading: signal(false),
    showLoading: jasmine.createSpy('showLoading').and.resolveTo(),
    hideLoading: jasmine.createSpy('hideLoading').and.resolveTo(),
  };

  const taskNeonServiceMock = {
    upload: jasmine.createSpy('upload').and.resolveTo(),
    editTask: jasmine.createSpy('editTask').and.resolveTo(),
    deleteTask: jasmine.createSpy('deleteTask').and.resolveTo(),
  };

  const snackBarMock = {
    open: jasmine.createSpy('open'),
  };

  const ids = (tasks: Task[]): number[] => tasks.map((task) => task.id);

  beforeEach(async () => {
    undoAction = new Subject<void>();
    snackBarMock.open.calls.reset();
    snackBarMock.open.and.returnValue({ onAction: () => undoAction });

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), TabListPage],
      providers: [
        provideNoopAnimations(),
        { provide: TaskService, useValue: taskServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: LoadingService, useValue: loadingServiceMock },
        { provide: TaskNeonService, useValue: taskNeonServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    taskServiceMock.tasks.set([]);
    taskServiceMock.filter.set(StatusEnum.All);
    fixture = TestBed.createComponent(TabListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter tasks by title, description and tag', () => {
    taskServiceMock.tasks.set([
      makeTask({ id: 1, title: 'Buy milk', priority: 'low' }),
      makeTask({ id: 2, title: 'Call', description: 'dentist appointment', tags: ['health'], priority: 'high' }),
      makeTask({ id: 3, title: 'Walk', tags: ['dog'] }),
    ]);

    component['searchQuery'].set('dent');
    expect(ids(component['filteredTasks']())).toEqual([2]);

    component['searchQuery'].set('dog');
    expect(ids(component['filteredTasks']())).toEqual([3]);

    component['searchQuery'].set('buy');
    expect(ids(component['filteredTasks']())).toEqual([1]);
  });

  it('should clear search with extra filters', () => {
    component['searchQuery'].set('milk');
    component['selectedPriorityFilter'].set('high');
    component['clearAdvancedFilters']();

    expect(component['searchQuery']()).toBe('');
    expect(component['selectedPriorityFilter']()).toBe('all');
    expect(component['hasSearchQuery']()).toBeFalse();
  });

  it('adds a task from a composer draft', () => {
    component['addTask']({ title: 'New task', description: '', priority: 'high', tags: ['work'] });

    expect(taskServiceMock.tasks().length).toBe(1);
    expect(taskServiceMock.tasks()[0]).toEqual(
      jasmine.objectContaining({ title: 'New task', priority: 'high', tags: ['work'], done: false }),
    );
  });

  it('counts each status within the current narrowing', () => {
    taskServiceMock.tasks.set([
      makeTask({ id: 1, title: 'A', priority: 'high' }),
      makeTask({ id: 2, title: 'B', priority: 'high', done: true }),
      makeTask({ id: 3, title: 'C', priority: 'low' }),
    ]);

    component['togglePriorityFilter']('high');

    expect(component['statusCounts']()).toEqual({ all: 2, pending: 1, done: 1 });

    component['togglePriorityFilter']('high');

    expect(component['selectedPriorityFilter']()).toBe('all');
  });

  it('writes priority as a word with its hue and lists tags on the row', () => {
    taskServiceMock.tasks.set([
      makeTask({ id: 1, title: 'Tagged task', tags: ['work'], priority: 'high' }),
    ]);
    fixture.detectChanges();

    const item: HTMLElement = fixture.nativeElement.querySelector('ion-item.task-item');
    const priority: HTMLElement = fixture.nativeElement.querySelector('.priority-tag');
    const chip: HTMLElement = fixture.nativeElement.querySelector('.tag-chip');

    expect(item.dataset['priority']).toBe('high');
    expect(priority.textContent).toContain('TASKS.PRIORITY.HIGH');
    expect(chip.textContent).toContain('#work');
  });

  it('keeps search in the header and omits a filter search chip', () => {
    taskServiceMock.tasks.set([makeTask({ id: 1, title: 'Tagged task', tags: ['work'] })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.filter-chip--search')).toBeNull();
    expect(fixture.nativeElement.querySelector('.toolbar-search-icon')).toBeTruthy();
  });

  it('keeps a crossed-off task among the open ones until its stroke settles', fakeAsync(() => {
    taskServiceMock.tasks.set([makeTask({ id: 1, title: 'Water the plants' })]);

    component['toggleTaskState'](1);

    expect(taskServiceMock.tasks()[0].done).toBeTrue();
    expect(ids(component['openTasks']())).toEqual([1]);

    tick(650);

    expect(ids(component['openTasks']())).toEqual([]);
    expect(ids(component['doneTasks']())).toEqual([1]);
  }));

  it('opens the editor in place when a task is tapped, and saves it', () => {
    taskServiceMock.tasks.set([makeTask({ id: 1, title: 'Book dentist' })]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.task-body') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-task-editor')).toBeTruthy();

    component['saveEdit'](1, { title: 'Book the dentist', description: '', priority: 'high', tags: [] });
    fixture.detectChanges();

    expect(taskServiceMock.tasks()[0]).toEqual(
      jasmine.objectContaining({ title: 'Book the dentist', priority: 'high' }),
    );
    expect(fixture.nativeElement.querySelector('app-task-editor')).toBeNull();
  });

  it('deletes at once and restores the task on Undo', async () => {
    const task = makeTask({ id: 1, title: 'Renew passport' });
    taskServiceMock.tasks.set([task]);

    component['deleteTask'](1);

    expect(taskServiceMock.tasks()).toEqual([]);
    expect(snackBarMock.open).toHaveBeenCalledWith('TASKS.TASK_DELETED', 'TASKS.UNDO', jasmine.any(Object));

    undoAction.next();
    await fixture.whenStable();

    expect(taskServiceMock.tasks()).toEqual([task]);
  });
});
