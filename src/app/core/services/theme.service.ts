import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  public isDark = signal(false);

  public setTheme(): void {
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      this.isDark.set(true);
    }
  }

  public switchTheme(): void {
    const body = document.body;
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      this.isDark.set(false);
      localStorage.removeItem('theme');
      body.classList.remove('dark-theme');
    } else {
      this.isDark.set(true);
      localStorage.setItem('theme', 'dark');
      body.classList.add('dark-theme');
    }
  }
}
