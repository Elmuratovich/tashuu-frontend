import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeKy from '@angular/common/locales/ky';
import localeRu from '@angular/common/locales/ru';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEn);
registerLocaleData(localeRu);
registerLocaleData(localeKy);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
