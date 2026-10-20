import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { Platform } from '@ionic/angular';

/** The event Chromium browsers fire when the app can be installed. TypeScript's DOM types lack it. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * How this browser adds the app to the home screen:
 * - `prompt`: the browser hands over its own install dialog (Chrome, Edge, Samsung Internet).
 * - `guide`: iOS and iPadOS install only from the Share menu, so the app shows the steps.
 * - `none`: already installed, hidden by the person, or not installable in this browser.
 */
export type InstallMethod = 'prompt' | 'guide' | 'none';

/** The key and value the old install alert wrote, so people who hid the button keep it hidden. */
const HIDE_INSTALL_KEY = 'install';
const HIDDEN = 'false';

@Service()
export class InstallService {
  private readonly platform = inject(Platform);
  private readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly isInstalled = signal(this.platform.is('pwa'));
  private readonly isHidden = signal(localStorage.getItem(HIDE_INSTALL_KEY) === HIDDEN);

  readonly method = computed<InstallMethod>(() => {
    if (this.isInstalled() || this.isHidden()) {
      return 'none';
    }

    if (this.installPrompt()) {
      return 'prompt';
    }

    return this.platform.is('ios') ? 'guide' : 'none';
  });

  readonly canInstall = computed(() => this.method() !== 'none');

  constructor() {
    const listeners = new AbortController();
    inject(DestroyRef).onDestroy(() => listeners.abort());

    window.addEventListener(
      'beforeinstallprompt',
      (event) => {
        // Holds back the browser's own banner: the header button opens the same dialog.
        event.preventDefault();
        this.installPrompt.set(event as BeforeInstallPromptEvent);
      },
      { signal: listeners.signal },
    );

    window.addEventListener('appinstalled', () => this.markInstalled(), {
      signal: listeners.signal,
    });
  }

  /** Opens the browser's install dialog. Resolves to whether the person installed the app. */
  async promptInstall(): Promise<boolean> {
    const installPrompt = this.installPrompt();
    if (!installPrompt) {
      return false;
    }

    // A prompt opens only once; the browser fires a new event when it can offer install again.
    this.installPrompt.set(null);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      this.markInstalled();
    }

    return outcome === 'accepted';
  }

  hideInstallButton(): void {
    this.isHidden.set(true);
    localStorage.setItem(HIDE_INSTALL_KEY, HIDDEN);
  }

  private markInstalled(): void {
    this.installPrompt.set(null);
    this.isInstalled.set(true);
  }
}
