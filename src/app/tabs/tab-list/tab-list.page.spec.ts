import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from 'src/app/core/services/loading.service';
import { TaskNeonService } from 'src/app/core/services/task-neon.service';
import { TaskService } from 'src/app/core/services/task.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TabListPage } from './tab-list.page';
import { StatusEnum } from './types/statusEnum';

describe('TabListPage', () => {
  let component: TabListPage;
  let fixture: ComponentFixture<TabListPage>;

  const taskServiceMock = {
    tasks: signal([]),
    filter: signal(StatusEnum.All),
    shouldShowInstall: signal(true),
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), TabListPage],
      providers: [
        provideNoopAnimations(),
        { provide: TaskService, useValue: taskServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: LoadingService, useValue: loadingServiceMock },
        { provide: TaskNeonService, useValue: taskNeonServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TabListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
