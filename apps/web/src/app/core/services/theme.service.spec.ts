import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let themeColor: HTMLMetaElement;

  beforeEach(() => {
    localStorage.removeItem('theme');
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('ion-palette-dark');
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    themeColor.remove();
    localStorage.removeItem('theme');
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('turns on the app and Ionic dark palettes together', () => {
    service.switchTheme();

    expect(service.isDark()).toBeTrue();
    expect(document.body.classList).toContain('dark-theme');
    expect(document.documentElement.classList).toContain('ion-palette-dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('turns both palettes off again', () => {
    service.switchTheme();
    service.switchTheme();

    expect(service.isDark()).toBeFalse();
    expect(document.body.classList).not.toContain('dark-theme');
    expect(document.documentElement.classList).not.toContain('ion-palette-dark');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('matches the browser bar to the header in each theme', () => {
    service.setTheme();
    expect(themeColor.content).toBe('#2b3fd0');

    service.switchTheme();
    expect(themeColor.content).toBe('#1d2566');
  });

  it('restores the saved dark theme', () => {
    localStorage.setItem('theme', 'dark');

    service.setTheme();

    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList).toContain('ion-palette-dark');
  });
});
