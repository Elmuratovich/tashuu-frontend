import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';

const LOCALE_BY_LANG: Record<string, string> = {
  en: 'en-US',
  ru: 'ru',
  kg: 'ky'
};

@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private language = inject(LanguageService);
  private datePipe = new DatePipe('en-US');

  transform(
    value: string | number | Date | null | undefined,
    format = 'd MMM y, HH:mm',
    timezone = '+0600'
  ): string | null {
    const lang = this.language.current();
    const locale = LOCALE_BY_LANG[lang] ?? 'en-US';
    const resolved = format === 'medium' ? 'd MMM y, HH:mm' : format;
    return this.datePipe.transform(value ?? null, resolved, timezone, locale);
  }
}
