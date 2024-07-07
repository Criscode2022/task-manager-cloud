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
  protected message = signal<string | null>(null);
  protected userId = this.http.userId;

  protected loading = this.http.loading;
  protected uploading = false;

  public alertButtons = [
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
      label: 'User ID',
      required: true,
    },
  ];

  protected async upload() {
    try {
      this.uploading = true;
      const tasks = await this.taskService.getTasks();
      this.tasks.set(tasks);

      if (tasks.length === 0) {
        this.message.set('No tasks to upload');
        return;
      }

      this.message.set(null);
      await this.http.upload(tasks);
    } catch (error) {
      console.error('Error uploading tasks:', error);
    } finally {
      this.uploading = false;
    }
  }

  protected async download(userId: number) {
    this.http.download(userId);
  }
}
