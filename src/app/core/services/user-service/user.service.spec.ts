import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { PinHashService } from '../pin-hash.service';
import { TaskSupabaseService } from '../task-supabase.service';
import { TaskService } from '../task.service';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let taskServiceMock: {
    getTasks: jasmine.Spy;
    userId: ReturnType<typeof signal<number>>;
    storage: {
      set: jasmine.Spy;
      get: jasmine.Spy;
      remove: jasmine.Spy;
    };
  };
  let taskSupabaseServiceMock: {
    createUser: jasmine.Spy;
    bulkUpload: jasmine.Spy;
    download: jasmine.Spy;
    deleteUser: jasmine.Spy;
  };
  let pinHashServiceMock: {
    generatePin: jasmine.Spy;
    hashPin: jasmine.Spy;
  };
  let dialogMock: jasmine.SpyObj<MatDialog>;
  let snackBarMock: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    taskServiceMock = {
      getTasks: jasmine.createSpy('getTasks').and.resolveTo([]),
      userId: signal(0),
      storage: {
        set: jasmine.createSpy('set').and.resolveTo(),
        get: jasmine.createSpy('get').and.resolveTo(null),
        remove: jasmine.createSpy('remove').and.resolveTo(),
      },
    };

    taskSupabaseServiceMock = {
      createUser: jasmine.createSpy('createUser').and.resolveTo(42),
      bulkUpload: jasmine.createSpy('bulkUpload').and.resolveTo(),
      download: jasmine.createSpy('download').and.resolveTo(),
      deleteUser: jasmine.createSpy('deleteUser').and.resolveTo(),
    };

    pinHashServiceMock = {
      generatePin: jasmine.createSpy('generatePin').and.returnValue('1234'),
      hashPin: jasmine.createSpy('hashPin').and.resolveTo('hash-1234'),
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
        { provide: TaskSupabaseService, useValue: taskSupabaseServiceMock },
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

  it('should create user, store pin hash, and open PIN dialog', async () => {
    taskServiceMock.getTasks.and.resolveTo([
      { id: 1, title: 'A', done: false },
    ]);

    await service.createUser();

    expect(pinHashServiceMock.generatePin).toHaveBeenCalled();
    expect(pinHashServiceMock.hashPin).toHaveBeenCalledWith('1234');
    expect(taskSupabaseServiceMock.createUser).toHaveBeenCalledWith(
      'hash-1234',
    );
    expect(taskServiceMock.userId()).toBe(42);
    expect(service.userId()).toBe(42);
    expect(taskServiceMock.storage.set).toHaveBeenCalledWith(
      'pinHash',
      'hash-1234',
    );
    expect(taskSupabaseServiceMock.bulkUpload).toHaveBeenCalled();
    expect(dialogMock.open).toHaveBeenCalled();
    expect(snackBarMock.open).not.toHaveBeenCalledWith(
      'Failed to create user',
      'Close',
      jasmine.anything(),
    );
  });

  it('should show failed message when user creation returns null', async () => {
    taskSupabaseServiceMock.createUser.and.resolveTo(null);

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
    taskSupabaseServiceMock.createUser.and.rejectWith(new Error('boom'));

    await service.createUser();

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Error creating user',
      'Close',
      {
        duration: 2000,
      },
    );
  });

  it('should return early from getUser when no pin hash is in storage', async () => {
    taskServiceMock.storage.get.and.resolveTo(null);

    await service.getUser();

    expect(taskSupabaseServiceMock.download).not.toHaveBeenCalled();
    expect(service.pinHash()).toBeNull();
  });

  it('should download tasks and set pin hash when a session exists', async () => {
    taskServiceMock.storage.get.and.resolveTo('stored-hash');

    await service.getUser();

    expect(taskSupabaseServiceMock.download).toHaveBeenCalledWith(
      'stored-hash',
    );
    expect(service.pinHash()).toBe('stored-hash');
  });

  it('should clear session data when getUser fails', async () => {
    taskServiceMock.storage.get.and.resolveTo('stored-hash');
    taskSupabaseServiceMock.download.and.rejectWith(new Error('download-fail'));

    await service.getUser();

    expect(taskServiceMock.storage.remove).toHaveBeenCalledWith('pinHash');
    expect(taskServiceMock.storage.remove).toHaveBeenCalledWith('userId');
  });

  it('should delete user and reset local state', async () => {
    taskServiceMock.userId.set(21);
    service.userId.set(21);
    service.pinHash.set('existing');

    await service.delete(21);

    expect(taskSupabaseServiceMock.deleteUser).toHaveBeenCalledWith(21);
    expect(taskServiceMock.userId()).toBe(0);
    expect(service.userId()).toBe(0);
    expect(service.pinHash()).toBeNull();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'User deleted successfully',
      'Close',
      {
        duration: 5000,
      },
    );
  });

  it('should throw when delete fails', async () => {
    taskSupabaseServiceMock.deleteUser.and.rejectWith(new Error('delete-fail'));

    await expectAsync(service.delete(5)).toBeRejected();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Error deleting user',
      'Close',
      {
        duration: 5000,
      },
    );
  });
});
