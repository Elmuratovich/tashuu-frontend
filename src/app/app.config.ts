import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { languageInterceptor } from './core/i18n/language.interceptor';
import { LanguageService } from './core/i18n/language.service';
import { DEFAULT_LANGUAGE } from './core/i18n/languages';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([languageInterceptor, authInterceptor])),
    provideTranslateService({
      lang: DEFAULT_LANGUAGE,
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      })
    }),
    provideAppInitializer(() => {
      inject(LanguageService).init();
    })
  ]
};
