import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  SegmentedControlComponent,
  SegmentOption,
} from 'src/app/core/components/segmented-control/segmented-control.component';
import { LanguageService } from 'src/app/core/services/language.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { PinHashService } from '../../core/services/pin-hash.service';
import { NeonApiService } from '../../core/services/neon-api.service';
import { TaskService } from '../../core/services/task.service';
import { User } from './types/user';

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  en: 'LANGUAGE.EN',
  es: 'LANGUAGE.ES',
};

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  imports: [IonicModule, TranslateModule, SegmentedControlComponent],
})
export class TabOptionsPage {
  private readonly taskService = inject(TaskService);
  private readonly loadingService = inject(LoadingService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly pinHashService = inject(PinHashService);
  private readonly alertController = inject(AlertController);
  private readonly neon = inject(NeonApiService);
  private readonly translate = inject(TranslateService);
  protected readonly languageService = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);
  protected readonly userService = inject(UserService);

  protected isDark = this.themeService.isDark;
  protected selectedLanguage = this.languageService.currentLanguage;
  protected readonly languageOptions: SegmentOption<string>[] = this.languageService
    .getSupportedLanguages()
    .map((language) => ({
      value: language,
      labelKey: LANGUAGE_LABEL_KEYS[language] ?? language,
    }));

  protected userId = this.taskService.userId;
  protected tasks = this.taskService.tasks;
  protected isLoading = this.loadingService.isLoading;

  protected async uploadTasks(): Promise<void> {
    await this.userService.createUser();
  }

  protected changeLanguage(language: string): void {
    this.languageService.setLanguage(language);
  }

  protected async download(pin: User['pin']): Promise<void> {
    try {
      const pinString = String(pin);

      if (!this.pinHashService.isValidPin(pinString)) {
        this.snackbar.open(
          this.translate.instant('OPTIONS.PIN_MUST_HAVE_8_DIGITS'),
          this.translate.instant('COMMON.CLOSE'),
          {
            duration: 5000,
          },
        );
        return;
      }

      await this.userService.loginWithPin(pinString);
    } catch (error) {
      console.error('Login error:', error);
      this.snackbar.open(
        this.translate.instant('OPTIONS.INVALID_PIN_TRY_AGAIN'),
        this.translate.instant('COMMON.CLOSE'),
        {
          duration: 5000,
        },
      );
    }
  }

  protected async activateOfflineMode(): Promise<void> {
    await this.userService.logout();
  }

  protected async showLoginAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('OPTIONS.LOGIN_WITH_PIN'),
      message: this.translate.instant('OPTIONS.LOGIN_ALERT_MESSAGE'),
      inputs: [
        {
          name: 'pin',
          type: 'text',
          placeholder: this.translate.instant('COMMON.PIN'),
          attributes: {
            maxlength: 8,
            inputmode: 'numeric',
            autocomplete: 'off',
            'aria-label': this.translate.instant('COMMON.PIN'),
          },
        },
      ],
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('COMMON.LOGIN'),
          role: 'confirm',
          handler: (data) => {
            this.download(data.pin);
          },
        },
      ],
    });

    await alert.present();
  }

  protected async showGoOfflineAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('COMMON.CONFIRMATION'),
      message: this.translate.instant('OPTIONS.GO_OFFLINE_ALERT'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('OPTIONS.GO_OFFLINE'),
          role: 'confirm',
          handler: () => {
            this.activateOfflineMode();
          },
        },
      ],
    });

    await alert.present();
  }

  protected async showDeleteUserAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('OPTIONS.DELETE_ACCOUNT'),
      message: this.translate.instant('OPTIONS.DELETE_USER_ALERT'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('OPTIONS.DELETE_ACCOUNT'),
          role: 'destructive',
          handler: () => {
            this.userService.delete(this.userId());
          },
        },
      ],
    });

    await alert.present();
  }

  protected async showInfoAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('COMMON.INFORMATION'),
      message: this.translate.instant('OPTIONS.INFO_ALERT'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CLOSE'),
          role: 'cancel',
        },
      ],
    });

    await alert.present();
  }

  /** Offline, tasks live only here; signed in, the person chooses the cloud or both. */
  protected async showDeleteAllTasksAlert(): Promise<void> {
    const cancel = { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' };
    const buttons = !this.userId()
      ? [
          cancel,
          {
            text: this.translate.instant('OPTIONS.DELETE_ALL_TASKS'),
            role: 'destructive',
            handler: () => this.deleteAllTasksLocal(),
          },
        ]
      : [
          cancel,
          {
            text: this.translate.instant('OPTIONS.DELETE_FROM_CLOUD_ONLY'),
            role: 'destructive',
            handler: () => this.deleteAllTasksCloudOnly(),
          },
          {
            text: this.translate.instant('OPTIONS.DELETE_FROM_BOTH_CLOUD_AND_DEVICE'),
            role: 'destructive',
            handler: () => this.deleteAllTasksBoth(),
          },
        ];

    const alert = await this.alertController.create({
      header: this.translate.instant('OPTIONS.DELETE_ALL_TASKS'),
      message: !this.userId()
        ? this.translate.instant('OPTIONS.DELETE_TASKS_ALERT')
        : this.translate.instant('OPTIONS.CHOOSE_WHERE_DELETE_TASKS'),
      buttons,
    });

    await alert.present();
  }

  protected deleteAllTasksLocal(): void {
    this.taskService.tasks.set([]);
  }

  /** Deletes the cloud copy and goes offline, keeping the tasks on this device. */
  protected async deleteAllTasksCloudOnly(): Promise<void> {
    const userId = this.userId();
    if (!userId) return;

    const token = this.userService.accessToken();
    if (!token) return;

    try {
      await this.neon.deleteAllTasks(userId, token);
      await this.activateOfflineMode();

      this.snackbar.open(
        this.translate.instant('OPTIONS.TASKS_DELETED_CLOUD_OFFLINE_MODE'),
        this.translate.instant('COMMON.CLOSE'),
        {
          duration: 3000,
        },
      );
    } catch (error) {
      console.error('Error deleting tasks from cloud:', error);
      this.snackbar.open(
        this.translate.instant('OPTIONS.ERROR_DELETING_TASKS_FROM_CLOUD'),
        this.translate.instant('COMMON.CLOSE'),
        {
          duration: 5000,
        },
      );
    }
  }

  protected async deleteAllTasksBoth(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      this.deleteAllTasksLocal();
      return;
    }

    const token = this.userService.accessToken();
    if (!token) return;

    try {
      await this.neon.deleteAllTasks(userId, token);
      this.taskService.tasks.set([]);

      this.snackbar.open(
        this.translate.instant('OPTIONS.ALL_TASKS_DELETED_CLOUD_DEVICE'),
        this.translate.instant('COMMON.CLOSE'),
        {
          duration: 3000,
        },
      );
    } catch (error) {
      console.error('Error deleting tasks:', error);
      this.snackbar.open(
        this.translate.instant('OPTIONS.ERROR_DELETING_TASKS'),
        this.translate.instant('COMMON.CLOSE'),
        {
          duration: 5000,
        },
      );
    }
  }
}
