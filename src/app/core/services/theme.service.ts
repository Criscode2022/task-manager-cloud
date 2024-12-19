import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  public setTheme(): void {
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
    }
  }

  public switchTheme(): void {
    const body = document.body;
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      localStorage.removeItem('theme');
      body.classList.remove('theme-dark');
    } else {
      localStorage.setItem('theme', 'dark');
      body.classList.add('theme-dark');
    }
  }
}
