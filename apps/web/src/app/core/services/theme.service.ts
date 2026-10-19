import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'theme';
const DARK_THEME = 'dark';

/** The header colour in each theme, so the browser bar blends into it. */
const HEADER_COLOR = { light: '#2b3fd0', dark: '#1d2566' } as const;

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  public isDark = signal(false);

  public setTheme(): void {
    this.applyTheme(localStorage.getItem(THEME_KEY) === DARK_THEME);
  }

  public switchTheme(): void {
    const dark = !this.isDark();

    if (dark) {
      localStorage.setItem(THEME_KEY, DARK_THEME);
    } else {
      localStorage.removeItem(THEME_KEY);
    }

    this.applyTheme(dark);
  }

  private applyTheme(dark: boolean): void {
    this.isDark.set(dark);
    document.body.classList.toggle('dark-theme', dark);
    document.documentElement.classList.toggle('ion-palette-dark', dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? HEADER_COLOR.dark : HEADER_COLOR.light);
  }
}
