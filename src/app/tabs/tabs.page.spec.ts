import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { TaskService } from '../core/services/task.service';
import { ThemeService } from '../core/services/theme.service';
import { UserService } from '../core/services/user-service/user.service';

import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  const taskServiceMock = {
    tasks: signal([]),
    shouldShowInstall: signal(true),
    storage: {},
    storageInitialized: new BehaviorSubject<void>(undefined),
    getTasks: jasmine.createSpy('getTasks').and.resolveTo([]),
  };

  const themeServiceMock = {
    setTheme: jasmine.createSpy('setTheme'),
  };

  const userServiceMock = {
    getUser: jasmine.createSpy('getUser').and.resolveTo(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabsPage],
      imports: [TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
