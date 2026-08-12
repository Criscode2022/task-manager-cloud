import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'language';
  private readonly translate = inject(TranslateService);
  private readonly supportedLanguages = ['en', 'es'];

  protected readonly defaultLanguage = 'en';
  readonly currentLanguage = signal(this.defaultLanguage);

  initLanguage(): void {
    this.translate.addLangs(this.supportedLanguages);
    this.translate.setDefaultLang(this.defaultLanguage);

    const storedLanguage = localStorage.getItem(LanguageService.STORAGE_KEY);
    const language = this.isSupported(storedLanguage)
      ? storedLanguage
      : this.defaultLanguage;

    this.setLanguage(language);
  }

  setLanguage(language: string): void {
    if (!this.isSupported(language)) {
      return;
    }

    this.translate.use(language);
    this.currentLanguage.set(language);
    localStorage.setItem(LanguageService.STORAGE_KEY, language);
  }

  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  private isSupported(language: string | null): language is string {
    return !!language && this.supportedLanguages.includes(language);
  }
}
