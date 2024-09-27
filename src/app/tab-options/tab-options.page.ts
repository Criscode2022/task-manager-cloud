import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';
import { User } from './types/User';

@Component({
  selector: 'app-tab-options',
  templateUrl: 'tab-options.page.html',
  styleUrls: ['tab-options.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class TabOptionsPage {
  private http = inject(TaskHttpService);
  private taskService = inject(TaskService);

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
        this.upload();
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

  protected async upload() {
    try {
      if (!this.tasks().length) {
        this.messageUpload.set('No tasks to upload');
        return;
      }

      this.messageUpload.set('');
      await this.http.upload(this.tasks(), this.userId() || undefined);
    } catch (error) {
      console.error('Error uploading tasks:', error);
    }
  }

  protected download(id: User['id']) {
    this.http.download(id);
  }
}
