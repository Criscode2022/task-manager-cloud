import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { LoadingService } from 'src/app/core/services/loading.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TaskHttpService } from '../../core/services/task-http.service';
import { TaskService } from '../../core/services/task.service';
import { AlertMessages } from '../../core/types/alert-messages';
import { User } from './types/user';

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  imports: [IonicModule, CommonModule, RouterModule, MatTooltipModule],
})
export class TabOptionsPage {
  private readonly tasksHttpService = inject(TaskHttpService);
  private readonly taskService = inject(TaskService);
  private readonly loadingService = inject(LoadingService);
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
        this.download(user.id);
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
        const { encryptedPin, iv, authTag } = this.userService.enctyptedData()!;

        this.userService.delete(this.userId(), iv, authTag, encryptedPin);
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
      min: 1000,
      label: 'User ID',
      required: true,
    },
  ];

  protected async uploadTasks(): Promise<void> {
    await this.userService.createUser();
  }

  protected download(id: User['id']): void {
    this.tasksHttpService.download(id);
  }

  protected async activateOfflineMode(): Promise<void> {
    this.taskService.userId.set(0);
    await this.taskService.storage?.remove('authTag');
    await this.taskService.storage?.remove('iv');
    await this.taskService.storage?.remove('pin');
  }
}
