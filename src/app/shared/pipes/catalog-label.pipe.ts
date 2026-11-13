import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';

export type CatalogKind = 'vehicle' | 'cargo' | 'region' | 'district';

export function catalogSlug(name: string): string {
  return name
    .trim()
    .replace(/[\/]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

@Pipe({ name: 'catalogLabel', standalone: true, pure: false })
export class CatalogLabelPipe implements PipeTransform {
  private translate = inject(TranslateService);
  private language = inject(LanguageService);

  transform(name: string | null | undefined, kind: CatalogKind): string {
    this.language.current();
    if (!name?.trim()) return '—';
    const section = kind === 'region' ? 'REGION' : kind === 'district' ? 'DISTRICT' : kind.toUpperCase();
    const key = `CATALOG.${section}.${catalogSlug(name)}`;
    const translated = this.translate.instant(key);
    return translated === key ? name : translated;
  }
}
