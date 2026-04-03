import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { TaskDTO } from 'src/app/tabs/tab-list/types/task';
import { environment } from 'src/environments/environment.prod';
import { TaskService } from './task.service';

import { TaskHttpService } from './task-http.service';

describe('TaskHttpService', () => {
  let service: TaskHttpService;
  let httpMock: HttpTestingController;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const taskServiceMock = {
    tasks: signal([]),
    userId: signal(0),
    storage: null,
  };

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    snackBarSpy.open.and.returnValue({
      onAction: () => of(void 0),
    } as any);

    TestBed.configureTestingModule({
      providers: [
        TaskHttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TaskService, useValue: taskServiceMock },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: { url: '/tabs/list' } },
      ],
    });

    service = TestBed.inject(TaskHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not upload when userId is missing', async () => {
    const task: TaskDTO = { title: 'Task without user' };

    await service.upload(task, 0, 'iv', 'auth', 'pin');

    httpMock.expectNone(`${environment.baseUrl}/insert-tasks`);
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('should upload task payload when userId exists', async () => {
    const task: TaskDTO = { id: 1, title: 'My Task', done: false };

    await service.upload(task, 123, 'iv-data', 'auth-tag', 'enc-pin');

    const request = httpMock.expectOne(`${environment.baseUrl}/insert-tasks`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      task,
      iv: 'iv-data',
      authTag: 'auth-tag',
      encryptedPin: 'enc-pin',
      userId: 123,
    });

    request.flush({});
  });

  it('should edit task payload when userId exists', async () => {
    const task: TaskDTO = { id: 2, title: 'Edited Task', done: true };

    await service.editTask(task, 123, 'iv-edit', 'auth-edit', 'pin-edit');

    const request = httpMock.expectOne(`${environment.baseUrl}/edit`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      task,
      iv: 'iv-edit',
      authTag: 'auth-edit',
      encryptedPin: 'pin-edit',
      userId: 123,
    });

    request.flush({});
  });

  it('should not edit when userId is missing', async () => {
    await service.editTask(
      { title: 'Task without user' },
      0,
      'iv',
      'auth',
      'pin',
    );

    httpMock.expectNone(`${environment.baseUrl}/edit`);
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('should set userId after createUser success response', () => {
    spyOn(taskServiceMock.userId, 'set');

    service.createUser();

    const request = httpMock.expectOne(`${environment.baseUrl}/create-user`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(taskServiceMock.tasks());

    request.flush({ user_id: 77 });

    expect(taskServiceMock.userId.set).toHaveBeenCalledWith(77);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'User created successfully',
      '',
      {
        duration: 850,
      },
    );
  });

  it('should show error snackbar when createUser returns no user_id', () => {
    spyOn(taskServiceMock.userId, 'set');

    service.createUser();

    const request = httpMock.expectOne(`${environment.baseUrl}/create-user`);
    request.flush({});

    expect(taskServiceMock.userId.set).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Error creating user',
      'Close',
      {
        duration: 5000,
      },
    );
  });
});
