import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { TaskService } from './task.service';
import { Task } from './types/Task';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  public userId = signal<number | null>(null);

  private http = inject(HttpClient);
  private taskService = inject(TaskService);

  public loading = false;

  async upload(tasks: Task[]) {
    this.loading = true;

    this.http
      .post('https://api-task-i35c.onrender.com/insert-tasks', tasks)
      .subscribe(
        (response: any) => {
          this.loading = false;
          this.userId.set(response['userid']);
        },
        (error) => {
          console.error('Error uploading tasks:', error);
        }
      );
  }

  async download(userId: number) {
    try {
      this.loading = true;

      this.http
        .get(`https://api-task-i35c.onrender.com/tasks/${userId}`)
        .subscribe((response: any) => {
          this.loading = false;
          this.taskService.saveTasks(response);
          this.taskService.downloadTasks.next(response);
        });
    } catch (error) {
      console.error('Error downloading tasks:', error);
    } finally {
      this.loading = false;
    }
  }
}
