import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LanguageService } from '../i18n/language.service';
import { environment } from '../../../environments/environment';

/** Sends the active UI language on Tashuu backend API requests (`kg` | `ru` | `en`). */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach custom headers to Tashuu backend API requests.
  // External APIs (OSRM, Photon, Nominatim, BigDataCloud) or static assets
  // will reject non-safelisted headers like 'X-Language' during CORS preflight.
  const isBackendApi = req.url.startsWith(environment.apiUrl) ||
    req.url.startsWith('/api') ||
    req.url.includes('localhost:5165');

  if (!isBackendApi) {
    return next(req);
  }

  const lang = inject(LanguageService).current();
  return next(req.clone({
    setHeaders: {
      'Accept-Language': lang,
      'X-Language': lang
    }
  }));
};

