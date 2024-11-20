import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TaskHttpService } from '../../core/services/task-http.service';
import { TaskService } from '../../core/services/task.service';
import { AlertMessages } from '../../core/types/alert-messages';
import { User } from './types/user';

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, MatTooltipModule],
})
export class TabOptionsPage {
  private http = inject(TaskHttpService);
  private taskService = inject(TaskService);

  protected alertMessages = AlertMessages;

  protected messageUpload = signal('');

  private tasks = this.taskService.tasks;
  protected userId = this.taskService.userId;
  protected loading = this.http.loading;
  protected messageDownload = this.http.messageDownload;

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
        this.http.delete(this.userId());
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
    try {
      if (!this.tasks().length) {
        this.messageUpload.set('No tasks to upload');
        return;
      }

      this.messageUpload.set('');
      await this.http.upload(this.tasks(), this.userId() || undefined);
    } catch (error) {
      console.error('Error uploading tasks:', error);
      this.messageUpload.set('Error uploading tasks');
    }
  }

  protected download(id: User['id']): void {
    this.http.download(id);
  }

  protected async activateOfflineMode(): Promise<void> {
    this.messageDownload.set('');
    this.taskService.userId.set(0);
    await this.taskService.storage?.remove('userId');
  }
}
