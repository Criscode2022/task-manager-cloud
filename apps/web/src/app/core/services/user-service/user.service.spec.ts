import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NeonApiService } from '../neon-api.service';
import { PinHashService } from '../pin-hash.service';
import { TaskNeonService } from '../task-neon.service';
import { TaskService } from '../task.service';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let taskServiceMock: {
    getTasks: jasmine.Spy;
    userId: ReturnType<typeof signal<number>>;
    tasks: ReturnType<typeof signal<unknown[]>>;
    storage: {
      set: jasmine.Spy;
      get: jasmine.Spy;
      remove: jasmine.Spy;
    };
  };
  let taskNeonServiceMock: {
    createUser: jasmine.Spy;
    bulkUpload: jasmine.Spy;
    download: jasmine.Spy;
    deleteUser: jasmine.Spy;
    restoreSession: jasmine.Spy;
  };
  let neonApiMock: {
    logout: jasmine.Spy;
    clearSession: jasmine.Spy;
  };
  let pinHashServiceMock: {
    generatePin: jasmine.Spy;
  };
  let dialogMock: jasmine.SpyObj<MatDialog>;
  let snackBarMock: jasmine.SpyObj<MatSnackBar>;

  const session = {
    id: 42,
    token: 'jwt-token',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    expires_in: 60,
  };

  beforeEach(() => {
    taskServiceMock = {
      getTasks: jasmine.createSpy('getTasks').and.resolveTo([]),
      userId: signal(0),
      tasks: signal([]),
      storage: {
        set: jasmine.createSpy('set').and.resolveTo(),
        get: jasmine.createSpy('get').and.resolveTo(null),
        remove: jasmine.createSpy('remove').and.resolveTo(),
      },
    };

    taskNeonServiceMock = {
      createUser: jasmine.createSpy('createUser').and.resolveTo(session),
      bulkUpload: jasmine.createSpy('bulkUpload').and.resolveTo(),
      download: jasmine.createSpy('download').and.resolveTo(session),
      deleteUser: jasmine.createSpy('deleteUser').and.resolveTo(),
      restoreSession: jasmine.createSpy('restoreSession').and.resolveTo(),
    };

    neonApiMock = {
      logout: jasmine.createSpy('logout').and.resolveTo(),
      clearSession: jasmine.createSpy('clearSession'),
    };

    pinHashServiceMock = {
      generatePin: jasmine.createSpy('generatePin').and.returnValue('12345678'),
    };

    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
    snackBarMock.open.and.returnValue({
      onAction: () => of(void 0),
    } as any);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: TaskService, useValue: taskServiceMock },
        { provide: TaskNeonService, useValue: taskNeonServiceMock },
        { provide: NeonApiService, useValue: neonApiMock },
        { provide: PinHashService, useValue: pinHashServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create user, store access token, and open PIN dialog', async () => {
    taskServiceMock.getTasks.and.resolveTo([
      { id: 1, title: 'A', done: false },
    ]);

    await service.createUser();

    expect(pinHashServiceMock.generatePin).toHaveBeenCalled();
    expect(taskNeonServiceMock.createUser).toHaveBeenCalledWith('12345678');
    expect(taskServiceMock.userId()).toBe(42);
    expect(service.userId()).toBe(42);
    expect(service.accessToken()).toBe('jwt-token');
    expect(taskServiceMock.storage.set).toHaveBeenCalledWith(
      'accessToken',
      'jwt-token',
    );
    expect(taskNeonServiceMock.bulkUpload).toHaveBeenCalledWith(
      [{ id: 1, title: 'A', done: false }],
      42,
      'jwt-token',
    );
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('should show failed message when user creation returns null', async () => {
    taskNeonServiceMock.createUser.and.resolveTo(null);

    await service.createUser();

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Failed to create user',
      'Close',
      {
        duration: 2000,
      },
    );
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('should show error message when createUser throws', async () => {
    taskNeonServiceMock.createUser.and.rejectWith(new Error('boom'));

    await service.createUser();

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Error creating user',
      'Close',
      {
        duration: 2000,
      },
    );
  });

  it('should return early from getUser when no session is in storage', async () => {
    taskServiceMock.storage.get.and.resolveTo(null);

    await service.getUser();

    expect(taskNeonServiceMock.restoreSession).not.toHaveBeenCalled();
    expect(service.accessToken()).toBeNull();
  });

  it('should restore session when a valid token exists', async () => {
    const expires = new Date(Date.now() + 60_000).toISOString();
    taskServiceMock.storage.get.and.callFake(async (key: string) => {
      if (key === 'pinHash') return null;
      if (key === 'accessToken') return 'jwt-token';
      if (key === 'sessionExpiresAt') return expires;
      if (key === 'userId') return 42;
      return null;
    });

    await service.getUser();

    expect(taskNeonServiceMock.restoreSession).toHaveBeenCalledWith(
      42,
      'jwt-token',
    );
    expect(service.accessToken()).toBe('jwt-token');
  });

  it('should clear session data when getUser fails', async () => {
    const expires = new Date(Date.now() + 60_000).toISOString();
    taskServiceMock.storage.get.and.callFake(async (key: string) => {
      if (key === 'pinHash') return null;
      if (key === 'accessToken') return 'jwt-token';
      if (key === 'sessionExpiresAt') return expires;
      if (key === 'userId') return 42;
      return null;
    });
    taskNeonServiceMock.restoreSession.and.rejectWith(new Error('fail'));

    await service.getUser();

    expect(taskServiceMock.storage.remove).toHaveBeenCalledWith('accessToken');
    expect(taskServiceMock.storage.remove).toHaveBeenCalledWith('userId');
  });

  it('should delete user and reset local state', async () => {
    taskServiceMock.userId.set(21);
    service.userId.set(21);
    service.accessToken.set('jwt-token');

    await service.delete(21);

    expect(taskNeonServiceMock.deleteUser).toHaveBeenCalledWith(21, 'jwt-token');
    expect(taskServiceMock.userId()).toBe(0);
    expect(service.userId()).toBe(0);
    expect(service.accessToken()).toBeNull();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'User deleted successfully',
      'Close',
      {
        duration: 5000,
      },
    );
  });

  it('should throw when delete fails', async () => {
    service.accessToken.set('jwt-token');
    taskNeonServiceMock.deleteUser.and.rejectWith(new Error('delete-fail'));

    await expectAsync(service.delete(5)).toBeRejected();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Error deleting user',
      'Close',
      {
        duration: 5000,
      },
    );
  });

  it('should throw when delete is called without a token', async () => {
    service.accessToken.set(null);

    await expectAsync(service.delete(5)).toBeRejected();
    expect(taskNeonServiceMock.deleteUser).not.toHaveBeenCalled();
  });
});
