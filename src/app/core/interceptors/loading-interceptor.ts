import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from 'src/app/core/services/loading.service';

let requestsInProgress = 0;

export const LoadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const loadingService = inject(LoadingService);

  requestsInProgress++;
  loadingService.isLoading.set(true);

  return next(req).pipe(
    finalize(() => {
      requestsInProgress--;
      if (requestsInProgress <= 0) {
        loadingService.isLoading.set(false);
        requestsInProgress = 0;
      }
    })
  );
};
