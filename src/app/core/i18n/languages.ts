export const SUPPORTED_LANGUAGES = ['kg', 'ru', 'uz', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: AppLanguage = 'kg';
export const LANGUAGE_STORAGE_KEY = 'tashuu_lang';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return !!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
