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
}
