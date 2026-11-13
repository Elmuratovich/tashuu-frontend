import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isAppLanguage
} from './languages';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly languages = SUPPORTED_LANGUAGES;
  readonly current = signal<AppLanguage>(DEFAULT_LANGUAGE);

  init(): void {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const browser = this.detectBrowserLanguage();
    const lang = isAppLanguage(saved) ? saved : browser;
    this.use(lang);
  }

  use(lang: AppLanguage): void {
    this.translate.use(lang);
    this.current.set(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private detectBrowserLanguage(): AppLanguage {
    const candidates = [navigator.language, ...(navigator.languages ?? [])]
      .map(l => l.toLowerCase().split('-')[0]);

    for (const code of candidates) {
      // Map common ISO aliases to project codes
      if (code === 'ky' || code === 'kg') return 'kg';
      if (code === 'ru') return 'ru';
      if (code === 'uz') return 'uz';
      if (code === 'en') return 'en';
    }
    return DEFAULT_LANGUAGE;
  }
}
