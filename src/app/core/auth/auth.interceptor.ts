import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBackendApi = req.url.startsWith(environment.apiUrl) ||
    req.url.startsWith('/api') ||
    req.url.includes('localhost:5165');

  if (!isBackendApi) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && !req.url.includes('/auth/login')) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};

