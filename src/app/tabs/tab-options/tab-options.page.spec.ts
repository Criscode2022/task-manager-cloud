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
import { SupabaseService } from '../../core/services/supabase.service';
import { TaskSupabaseService } from '../../core/services/task-supabase.service';
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

  const taskSupabaseServiceMock = {
    download: jasmine.createSpy('download').and.resolveTo(),
  };

  const pinHashServiceMock = {
    hashPin: jasmine.createSpy('hashPin').and.resolveTo('hashed-pin'),
  };

  const supabaseServiceMock = {
    deleteUser: jasmine.createSpy('deleteUser').and.resolveTo(),
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
        { provide: TaskSupabaseService, useValue: taskSupabaseServiceMock },
        { provide: PinHashService, useValue: pinHashServiceMock },
        { provide: SupabaseService, useValue: supabaseServiceMock },
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
