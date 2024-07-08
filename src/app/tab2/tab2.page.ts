import { Component, inject, signal } from '@angular/core';
import { TaskHttpService } from '../task-http.service';
import { TaskService } from '../task.service';
import { Task } from '../types/Task';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page {
  private taskService = inject(TaskService);
  private http = inject(TaskHttpService);

  protected tasks = signal<Task[]>([]);
  protected messageUpload = signal<string | null>(null);

  protected userId = this.http.userId;
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
      handler: (data: any) => {
        this.download(data.userId);
      },
    },
  ];

  public alertInputs = [
    {
      placeholder: 'User ID',
      type: 'number',
      name: 'userId',
      min: 1000,
      label: 'User ID',
      required: true,
    },
  ];

  protected async upload() {
    try {
      const tasks = await this.taskService.getTasks();
      this.tasks.set(tasks);

      if (tasks.length === 0) {
        this.messageUpload.set('No tasks to upload');
        return;
      }

      this.messageUpload.set(null);
      await this.http.upload(tasks);
    } catch (error) {
      console.error('Error uploading tasks:', error);
    }
  }

  protected async download(userId: number) {
    this.http.download(userId);
  }
}
