import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/core/services/language.service';
import { LoadingService } from 'src/app/core/services/loading.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { PinHashService } from '../../core/services/pin-hash.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TaskSupabaseService } from '../../core/services/task-supabase.service';
import { TaskService } from '../../core/services/task.service';
import { User } from './types/user';

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  imports: [
    IonicModule,
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    TranslateModule,
  ],
})
export class TabOptionsPage {
  private readonly tasksSupabaseService = inject(TaskSupabaseService);
  private readonly taskService = inject(TaskService);
  private readonly loadingService = inject(LoadingService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly pinHashService = inject(PinHashService);
  private readonly alertController = inject(AlertController);
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);
  protected readonly languageService = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);
  protected readonly userService = inject(UserService);

  protected isDark = this.themeService.isDark;
  protected selectedLanguage = this.languageService.currentLanguage;
  protected supportedLanguages = this.languageService.getSupportedLanguages();

  protected userId = this.taskService.userId;
  protected tasks = this.taskService.tasks;
  protected isLoading = this.loadingService.isLoading;

  public alertButtonsDownload = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Login',
      role: 'confirm',
      handler: (user: User) => {
        this.download(user.pin);
      },
    },
  ];

  public alertButtonsUpload = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: () => {
        this.uploadTasks();
      },
    },
  ];

  public alertButtonsDelete = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: () => {
        this.userService.delete(this.userId());
      },
    },
  ];

  public offlineButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: () => {
        this.activateOfflineMode();
      },
    },
  ];

  public alertButtonsInfo = [
    {
      text: 'Close',
      role: 'cancel',
    },
  ];

  public alertInputs = [
    {
      placeholder: 'Enter your 4-digit PIN',
      type: 'text',
      name: 'pin',
      attributes: {
        maxlength: 4,
        inputmode: 'numeric',
      },
      label: 'PIN',
      required: true,
    },
  ];

  protected async uploadTasks(): Promise<void> {
    await this.userService.createUser();
  }

  protected changeLanguage(language: string): void {
    this.languageService.setLanguage(language);
  }

  protected getLanguageLabel(language: string): string {
    const labels: Record<string, string> = {
      en: '🇬🇧 English',
      es: '🇪🇸 Espanol',
    };

    return labels[language] ?? language;
  }

  protected async download(pin: User['pin']): Promise<void> {
    try {
      // Convert PIN to string (alert input returns number)
      const pinString = String(pin);

      // Validate PIN format
      if (!pinString || pinString.length !== 4) {
        this.snackbar.open(
          this.translate.instant('OPTIONS.PIN_MUST_HAVE_4_DIGITS'),
          this.translate.instant('COMMON.CLOSE'),
          {
            duration: 5000,
          },
        );
        return;
      }

      if (/[a-zA-Z]/.test(pinString)) {
        this.snackbar.open(
          this.translate.instant('OPTIONS.PIN_CANNOT_CONTAIN_LETTERS'),
          this.translate.instant('COMMON.CLOSE'),
          {
            duration: 5000,
          },
        );
        return;
      }

      console.log('🔐 Logging in with PIN...');
      console.log('📌 PIN string:', pinString);

      // Hash the PIN using SHA-256
      const pinHash = await this.pinHashService.hashPin(pinString);
      console.log(
        '🔒 PIN hash (first 20 chars):',
        pinHash.substring(0, 20) + '...',
      );

      // Download tasks (this looks up user by PIN and downloads tasks)
      await this.tasksSupabaseService.download(pinHash);

      // Store PIN hash locally for session persistence
      this.userService.pinHash.set(pinHash);

      console.log('✅ Login successful!');
    } catch (error) {
      console.error('❌ Login error:', error);
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
    this.taskService.userId.set(0);
    await this.taskService.storage?.remove('pinHash');
    await this.taskService.storage?.remove('userId');
  }

  /**
   * Show login alert
   */
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
            maxlength: 4,
            inputmode: 'numeric',
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

  /**
   * Show go offline confirmation alert
   */
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
          text: this.translate.instant('COMMON.CONFIRM'),
          role: 'confirm',
          handler: () => {
            this.activateOfflineMode();
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Show delete user confirmation alert
   */
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
          text: this.translate.instant('COMMON.CONFIRM'),
          role: 'confirm',
          handler: () => {
            this.userService.delete(this.userId());
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Show info/help alert
   */
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

  /**
   * Show delete all tasks confirmation alert
   */
  protected async showDeleteAllTasksAlert(): Promise<void> {
    // Different options for online vs offline mode
    const buttons = !this.userId()
      ? [
          {
            text: this.translate.instant('COMMON.CANCEL'),
            role: 'cancel',
          },
          {
            text: this.translate.instant('OPTIONS.DELETE_ALL_TASKS'),
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksLocal();
            },
          },
        ]
      : [
          {
            text: this.translate.instant('COMMON.CANCEL'),
            role: 'cancel',
          },
          {
            text: this.translate.instant('OPTIONS.DELETE_FROM_CLOUD_ONLY'),
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksCloudOnly();
            },
          },
          {
            text: this.translate.instant(
              'OPTIONS.DELETE_FROM_BOTH_CLOUD_AND_DEVICE',
            ),
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksBoth();
            },
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

  /**
   * Delete all tasks locally only
   */
  protected deleteAllTasksLocal(): void {
    this.taskService.tasks.set([]);
  }

  /**
   * Delete all tasks from cloud only (keep local, go offline)
   */
  protected async deleteAllTasksCloudOnly(): Promise<void> {
    const userId = this.userId();
    if (!userId) return;

    const pinHash = this.userService.pinHash();
    if (!pinHash) return;

    try {
      // Verify user PIN first
      const isValidUser = await this.supabase.verifyUserPin(userId, pinHash);
      if (!isValidUser) {
        this.snackbar.open(
          this.translate.instant('OPTIONS.INVALID_CREDENTIALS'),
          this.translate.instant('COMMON.CLOSE'),
          { duration: 5000 },
        );
        return;
      }

      // Delete all tasks from cloud
      await this.supabase.deleteAllTasks(userId);

      // Go offline mode (keeps local tasks)
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

  /**
   * Delete all tasks from both cloud and device
   */
  protected async deleteAllTasksBoth(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      // If somehow offline, just delete local
      this.deleteAllTasksLocal();
      return;
    }

    const pinHash = this.userService.pinHash();
    if (!pinHash) return;

    try {
      // Verify user PIN first
      const isValidUser = await this.supabase.verifyUserPin(userId, pinHash);
      if (!isValidUser) {
        this.snackbar.open(
          this.translate.instant('OPTIONS.INVALID_CREDENTIALS'),
          this.translate.instant('COMMON.CLOSE'),
          { duration: 5000 },
        );
        return;
      }

      // Delete all tasks from cloud
      await this.supabase.deleteAllTasks(userId);

      // Delete all local tasks
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
