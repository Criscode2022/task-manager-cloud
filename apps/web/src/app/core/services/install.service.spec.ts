import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';

import { BeforeInstallPromptEvent, InstallService } from './install.service';

describe('InstallService', () => {
  const HIDE_INSTALL_KEY = 'install';

  const createService = (...platforms: string[]): InstallService => {
    TestBed.configureTestingModule({
      providers: [{ provide: Platform, useValue: { is: (name: string) => platforms.includes(name) } }],
    });
    return TestBed.inject(InstallService);
  };

  /** Fires the event Chromium sends when the app meets its install criteria. */
  const offerInstallPrompt = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    const prompt = jasmine.createSpy('prompt').and.resolveTo();
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) });
    window.dispatchEvent(event);
    return event as BeforeInstallPromptEvent;
  };

  beforeEach(() => localStorage.removeItem(HIDE_INSTALL_KEY));
  afterEach(() => localStorage.removeItem(HIDE_INSTALL_KEY));

  it('offers nothing where the browser cannot install the app', () => {
    const service = createService('desktop');

    expect(service.method()).toBe('none');
    expect(service.canInstall()).toBeFalse();
  });

  it('offers the browser prompt once the browser hands it over', () => {
    const service = createService('android');
    const event = offerInstallPrompt();

    expect(service.method()).toBe('prompt');
    expect(event.defaultPrevented).withContext('the browser banner stays hidden').toBeTrue();
  });

  it('installs through the browser prompt and stops offering it', async () => {
    const service = createService('android');
    const event = offerInstallPrompt('accepted');

    expect(await service.promptInstall()).toBeTrue();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(service.method()).toBe('none');
  });

  it('waits for a new prompt from the browser after a dismissal', async () => {
    const service = createService('android');
    offerInstallPrompt('dismissed');

    expect(await service.promptInstall()).toBeFalse();
    expect(service.method()).toBe('none');

    offerInstallPrompt();
    expect(service.method()).toBe('prompt');
  });

  it('stops offering install once the browser reports the app installed', () => {
    const service = createService('android');
    offerInstallPrompt();

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.method()).toBe('none');
  });

  it('guides iPhone and iPad users through the Share menu', () => {
    expect(createService('ios').method()).toBe('guide');
  });

  it('offers nothing inside the installed app', () => {
    const service = createService('ios', 'pwa');
    offerInstallPrompt();

    expect(service.method()).toBe('none');
  });

  it('keeps the install button hidden once the person hides it', () => {
    createService('ios').hideInstallButton();

    TestBed.resetTestingModule();

    expect(createService('ios').method()).toBe('none');
  });
});
