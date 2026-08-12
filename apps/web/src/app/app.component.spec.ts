import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './core/services/language.service';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const languageServiceMock = {
    initLanguage: jasmine.createSpy('initLanguage'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(languageServiceMock.initLanguage).toHaveBeenCalled();
  });
});
