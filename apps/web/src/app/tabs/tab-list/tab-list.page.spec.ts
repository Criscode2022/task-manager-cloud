import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
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

  const dialogMock = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => ({ subscribe: jasmine.createSpy('subscribe') }),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), TabListPage],
      providers: [
        provideNoopAnimations(),
        { provide: TaskService, useValue: taskServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: LoadingService, useValue: loadingServiceMock },
        { provide: TaskNeonService, useValue: taskNeonServiceMock },
        { provide: MatDialog, useValue: dialogMock },
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
      {
        id: 1,
        title: 'Buy milk',
        description: '',
        tags: [],
        done: false,
        priority: 'low' as const,
        created_at: new Date(),
        user_id: 0,
      },
      {
        id: 2,
        title: 'Call',
        description: 'dentist appointment',
        tags: ['health'],
        done: false,
        priority: 'high' as const,
        created_at: new Date(),
        user_id: 0,
      },
      {
        id: 3,
        title: 'Walk',
        description: '',
        tags: ['dog'],
        done: false,
        priority: 'medium' as const,
        created_at: new Date(),
        user_id: 0,
      },
    ]);

    component['searchQuery'].set('dent');
    expect(component['filteredTasks']().map((task) => task.id)).toEqual([2]);

    component['searchQuery'].set('dog');
    expect(component['filteredTasks']().map((task) => task.id)).toEqual([3]);

    component['searchQuery'].set('buy');
    expect(component['filteredTasks']().map((task) => task.id)).toEqual([1]);
  });

  it('should clear search with extra filters', () => {
    component['searchQuery'].set('milk');
    component['selectedPriorityFilter'].set('high');
    component['clearAdvancedFilters']();

    expect(component['searchQuery']()).toBe('');
    expect(component['selectedPriorityFilter']()).toBe('all');
    expect(component['hasSearchQuery']()).toBeFalse();
  });

  it('should collapse the create form after adding a task', async () => {
    component['isFormVisible'].set(true);
    component['taskModel'].set({
      title: 'New task',
      description: '',
      priority: 'medium',
      tagsInput: '',
    });

    await component['addTask']();

    expect(component['isFormVisible']()).toBeFalse();
    expect(taskServiceMock.tasks().length).toBe(1);
  });

  it('should tint the task card by priority and keep tags in the end slot', () => {
    taskServiceMock.tasks.set([
      {
        id: 1,
        title: 'Tagged task',
        description: '',
        tags: ['work'],
        done: false,
        priority: 'high' as const,
        created_at: new Date(),
        user_id: 0,
      },
    ]);
    fixture.detectChanges();

    const item: HTMLElement | null =
      fixture.nativeElement.querySelector('ion-item.task-item');
    const badge: HTMLElement | null =
      fixture.nativeElement.querySelector('.priority-badge');
    const chip: HTMLElement | null =
      fixture.nativeElement.querySelector('.tag-chip');

    expect(item?.classList.contains('task-priority-high')).toBeTrue();
    expect(badge).toBeNull();
    expect(chip?.textContent).toContain('#work');
  });
});
