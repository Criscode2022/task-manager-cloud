import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.removeItem('language');
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    localStorage.removeItem('language');
    document.documentElement.lang = 'en';
  });

  it('tells assistive tech which language the page is in', () => {
    service.setLanguage('es');

    expect(document.documentElement.lang).toBe('es');
    expect(service.currentLanguage()).toBe('es');
  });

  it('ignores languages the app does not ship', () => {
    service.setLanguage('fr');

    expect(service.currentLanguage()).toBe('en');
  });
});
