import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { LoadingService } from 'src/app/core/services/loading.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TaskSupabaseService } from '../../core/services/task-supabase.service';
import { TaskService } from '../../core/services/task.service';
import { PinHashService } from '../../core/services/pin-hash.service';
import { AlertMessages } from '../../core/types/alert-messages';
import { User } from './types/user';

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  imports: [IonicModule, CommonModule, RouterModule, MatTooltipModule],
})
export class TabOptionsPage {
  private readonly tasksSupabaseService = inject(TaskSupabaseService);
  private readonly taskService = inject(TaskService);
  private readonly loadingService = inject(LoadingService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly pinHashService = inject(PinHashService);
  private readonly alertController = inject(AlertController);
  protected readonly themeService = inject(ThemeService);
  protected readonly userService = inject(UserService);

  protected alertMessages = AlertMessages;
  protected isDark = this.themeService.isDark;

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
      type: 'number',
      name: 'pin',
      min: 1000,
      max: 9999,
      label: 'PIN',
      required: true,
    },
  ];

  protected async uploadTasks(): Promise<void> {
    await this.userService.createUser();
  }

  protected async download(pin: User['pin']): Promise<void> {
    try {
      // Convert PIN to string (alert input returns number)
      const pinString = String(pin);

      // Validate PIN format
      if (!pinString || pinString.length !== 4) {
        this.snackbar.open('PIN must be exactly 4 digits', 'Close', {
          duration: 5000,
        });
        return;
      }

      console.log('🔐 Logging in with PIN...');
      console.log('📌 PIN string:', pinString);

      // Hash the PIN using SHA-256
      const pinHash = await this.pinHashService.hashPin(pinString);
      console.log('🔒 PIN hash (first 20 chars):', pinHash.substring(0, 20) + '...');

      // Download tasks (this looks up user by PIN and downloads tasks)
      await this.tasksSupabaseService.download(pinHash);

      // Store PIN hash locally for session persistence
      this.userService.pinHash.set(pinHash);

      console.log('✅ Login successful!');
    } catch (error) {
      console.error('❌ Login error:', error);
      this.snackbar.open('Invalid PIN. Please try again.', 'Close', {
        duration: 5000,
      });
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
      header: 'Login with PIN',
      message: 'Enter your 4-digit PIN to sync your tasks',
      inputs: [
        {
          name: 'pin',
          type: 'number',
          placeholder: 'Enter your 4-digit PIN',
          min: 1000,
          max: 9999,
          attributes: {
            inputmode: 'numeric',
          },
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Login',
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
      header: 'Confirmation',
      message: this.alertMessages.GoOfflineAlert,
      buttons: [
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
      ],
    });

    await alert.present();
  }

  /**
   * Show delete user confirmation alert
   */
  protected async showDeleteUserAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete User ID',
      message: this.alertMessages.DeleteUserAlert,
      buttons: [
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
      ],
    });

    await alert.present();
  }

  /**
   * Show info/help alert
   */
  protected async showInfoAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Information',
      message: this.alertMessages.InfoAlert,
      buttons: [
        {
          text: 'Close',
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
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete All',
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksLocal();
            },
          },
        ]
      : [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete from Cloud Only',
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksCloudOnly();
            },
          },
          {
            text: 'Delete from Both',
            role: 'destructive',
            handler: () => {
              this.deleteAllTasksBoth();
            },
          },
        ];

    const alert = await this.alertController.create({
      header: 'Delete All Tasks',
      message: !this.userId()
        ? this.alertMessages.DeleteTasksAlert
        : 'Choose where to delete your tasks from:',
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

    // Delete all tasks from cloud
    const tasks = this.taskService.tasks();
    for (const task of tasks) {
      if (task.user_id) {
        await this.tasksSupabaseService.delete(task.id, userId, pinHash);
      }
    }

    // Go offline mode (keeps local tasks)
    await this.activateOfflineMode();

    this.snackbar.open('Tasks deleted from cloud. Now in offline mode.', 'Close', {
      duration: 3000,
    });
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

    // Delete all tasks from cloud
    const tasks = this.taskService.tasks();
    for (const task of tasks) {
      if (task.user_id) {
        await this.tasksSupabaseService.delete(task.id, userId, pinHash);
      }
    }

    // Delete all local tasks
    this.taskService.tasks.set([]);

    this.snackbar.open('All tasks deleted from cloud and device.', 'Close', {
      duration: 3000,
    });
  }
}
