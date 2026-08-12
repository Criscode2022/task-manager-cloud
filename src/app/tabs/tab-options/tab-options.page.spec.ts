import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LanguageService } from 'src/app/core/services/language.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { PinHashService } from '../../core/services/pin-hash.service';
import { NeonApiService } from '../../core/services/neon-api.service';
import { TaskNeonService } from '../../core/services/task-neon.service';
import { TaskService } from '../../core/services/task.service';

import { TabOptionsPage } from './tab-options.page';

describe('TabOptionsPage', () => {
  let component: TabOptionsPage;
  let fixture: ComponentFixture<TabOptionsPage>;

  const taskServiceMock = {
    userId: signal(0),
    tasks: signal([]),
    storage: {
      remove: jasmine.createSpy('remove').and.resolveTo(),
    },
  };

  const loadingServiceMock = {
    isLoading: signal(false),
  };

  const userServiceMock = {
    pinHash: signal<string | null>(null),
    createUser: jasmine.createSpy('createUser').and.resolveTo(),
    delete: jasmine.createSpy('delete').and.resolveTo(),
  };

  const languageServiceMock = {
    currentLanguage: signal('en'),
    getSupportedLanguages: jasmine
      .createSpy('getSupportedLanguages')
      .and.returnValue(['en', 'es']),
    setLanguage: jasmine.createSpy('setLanguage'),
  };

  const themeServiceMock = {
    isDark: signal(false),
  };

  const taskNeonServiceMock = {
    download: jasmine.createSpy('download').and.resolveTo(),
  };

  const pinHashServiceMock = {
    hashPin: jasmine.createSpy('hashPin').and.resolveTo('hashed-pin'),
  };

  const neonApiServiceMock = {
    deleteUser: jasmine.createSpy('deleteUser').and.resolveTo(),
    verifyUserPin: jasmine.createSpy('verifyUserPin').and.resolveTo(true),
    deleteAllTasks: jasmine.createSpy('deleteAllTasks').and.resolveTo(),
  };

  const snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
  snackBarMock.open.and.returnValue({ onAction: () => of(void 0) } as any);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        TabOptionsPage,
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
        { provide: LoadingService, useValue: loadingServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: TaskNeonService, useValue: taskNeonServiceMock },
        { provide: PinHashService, useValue: pinHashServiceMock },
        { provide: NeonApiService, useValue: neonApiServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TabOptionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
