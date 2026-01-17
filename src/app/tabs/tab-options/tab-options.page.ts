import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
  protected readonly themeService = inject(ThemeService);
  protected readonly userService = inject(UserService);

  protected alertMessages = AlertMessages;
  protected isDark = this.themeService.isDark;

  protected userId = this.taskService.userId;
  protected isLoading = this.loadingService.isLoading;

  public alertButtonsDownload = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: (user: User) => {
        this.download(user.id, user.pin);
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
      placeholder: 'User ID',
      type: 'number',
      name: 'id',
      min: 1,
      label: 'User ID',
      required: true,
    },
    {
      placeholder: '4-digit PIN',
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

  protected async download(id: User['id'], pin: User['pin']): Promise<void> {
    try {
      // Validate PIN format
      if (!pin || pin.length !== 4) {
        this.snackbar.open('PIN must be exactly 4 digits', 'Close', {
          duration: 5000,
        });
        return;
      }

      // Hash the PIN using SHA-256
      const pinHash = await this.pinHashService.hashPin(pin);

      console.log('Attempting to download tasks with User ID:', id);

      // Download tasks (this also verifies the PIN)
      await this.tasksSupabaseService.download(id, pinHash);

      // Store credentials locally for future use
      this.userService.pinHash.set(pinHash);

      console.log('Login successful, tasks downloaded');
    } catch (error) {
      console.error('Login error:', error);
      this.snackbar.open('Login failed. Please check your credentials.', 'Close', {
        duration: 5000,
      });
    }
  }

  protected async activateOfflineMode(): Promise<void> {
    this.taskService.userId.set(0);
    await this.taskService.storage?.remove('pinHash');
    await this.taskService.storage?.remove('userId');
  }
}
