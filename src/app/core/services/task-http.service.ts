import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, retry } from 'rxjs';
import { Task } from '../../shared/types/Task';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  public userId = signal<number | null>(null);

  private http = inject(HttpClient);
  private taskService = inject(TaskService);

  public loading = signal<boolean>(false);
  public messageDownload = signal<string | null>(null);

  public async upload(tasks: Task[]) {
    this.loading.set(true);

    this.http
      .post('https://api-task-i35c.onrender.com/insert-tasks', tasks)
      .pipe(
        retry(10),
        catchError((error) => {
          this.loading.set(false);
          console.error('Error uploading tasks:', error);
          throw error;
        })
      )
      .subscribe({
        next: (response: any) => {
          this.loading.set(false);
          this.userId.set(response['userid']);
        },
        error: (error: any) => {
          this.loading.set(false);
          console.error('Error uploading tasks:', error);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  public async download(userId: number): Promise<Task[]> {
    try {
      return new Promise<Task[]>((resolve, reject) => {
        this.http
          .get(`https://api-task-i35c.onrender.com/tasks/${userId}`)
          .pipe(retry(10))
          .subscribe({
            next: (response: any) => {
              const tasks = response.map((task: Task) => ({
                ...task,
                done: task.done ? true : false,
              }));
              this.taskService.saveTasks(tasks);
              this.messageDownload.set('success');
              resolve(tasks);
            },
            error: () => {
              this.messageDownload.set('error');
              reject();
            },
          });
      });
    } catch (error) {
      console.error('Error downloading tasks:', error);
      throw error;
    }
  }
}
