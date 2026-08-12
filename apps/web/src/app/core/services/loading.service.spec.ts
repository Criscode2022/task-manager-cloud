import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;
  let routerMock: { url: string };
  let loadingControllerMock: jasmine.SpyObj<LoadingController>;
  let loadingElement: { present: jasmine.Spy; dismiss: jasmine.Spy };

  beforeEach(() => {
    routerMock = { url: '/tabs/options' };
    loadingElement = {
      present: jasmine.createSpy('present').and.resolveTo(),
      dismiss: jasmine.createSpy('dismiss').and.resolveTo(),
    };
    loadingControllerMock = jasmine.createSpyObj('LoadingController', [
      'create',
    ]);
    loadingControllerMock.create.and.resolveTo(loadingElement as any);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: LoadingController, useValue: loadingControllerMock },
      ],
    });
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create and present loading on options route', async () => {
    await service.showLoading();

    expect(service.isLoading()).toBeTrue();
    expect(loadingControllerMock.create).toHaveBeenCalled();
    expect(loadingElement.present).toHaveBeenCalled();
  });

  it('should not create loading outside options route', async () => {
    routerMock.url = '/tabs/list';

    await service.showLoading();

    expect(service.isLoading()).toBeTrue();
    expect(loadingControllerMock.create).not.toHaveBeenCalled();
  });

  it('should dismiss loading and reset state when all requests complete', async () => {
    await service.showLoading();
    await service.hideLoading();

    expect(service.isLoading()).toBeFalse();
    expect(loadingElement.dismiss).toHaveBeenCalled();
  });

  it('should create only one loading for overlapping requests', async () => {
    await service.showLoading();
    await service.showLoading();

    expect(loadingControllerMock.create).toHaveBeenCalledTimes(1);

    await service.hideLoading();
    expect(service.isLoading()).toBeTrue();
    expect(loadingElement.dismiss).not.toHaveBeenCalled();

    await service.hideLoading();
    expect(service.isLoading()).toBeFalse();
    expect(loadingElement.dismiss).toHaveBeenCalledTimes(1);
  });

  it('should dismiss newly created loading if request finishes before create resolves', async () => {
    let resolveCreate!: (value: any) => void;
    const pendingCreate = new Promise<any>((resolve) => {
      resolveCreate = resolve;
    });
    loadingControllerMock.create.and.returnValue(pendingCreate);

    const showPromise = service.showLoading();
    await service.hideLoading();

    resolveCreate(loadingElement as any);
    await showPromise;

    expect(loadingElement.present).not.toHaveBeenCalled();
    expect(loadingElement.dismiss).toHaveBeenCalled();
    expect(service.isLoading()).toBeFalse();
  });
});
