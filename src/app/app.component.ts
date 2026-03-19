import { Component, inject } from '@angular/core';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false,
})
export class AppComponent {
  private readonly languageService = inject(LanguageService);

  constructor() {
    this.languageService.initLanguage();
  }
}
