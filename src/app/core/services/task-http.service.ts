import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, retry } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { Task } from '../../shared/types/Task';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  private http = inject(HttpClient);
  private taskService = inject(TaskService);

  public userId = signal<number | null>(null);
  public messageDownload = signal<string | null>(null);

  public loading = signal<boolean>(false);

  public async upload(tasks: Task[]) {
    this.loading.set(true);

    this.http
      .post(`${environment.baseUrl}/insert-tasks`, tasks)
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

  public download(userId: number) {
    this.http
      .get(`https://api-task-i35c.onrender.com/tasks/${userId}`, {
        observe: 'response',
      })
      .pipe(
        retry(10),
        catchError((error) => {
          console.error('Error downloading tasks:', error);

          if (error.status == 404) {
            this.messageDownload.set('not found');
          }

          if (error.status == 500) {
            this.messageDownload.set('error');
          }

          console.log(error.status);

          return [];
        })
      )
      .subscribe({
        next: (response: any) => {
          const tasks = response.body.map((task: Task) => ({
            ...task,
            done: !!task.done,
          }));
          this.taskService.saveTasks(tasks);
          this.taskService.tasks.set(tasks);
          this.messageDownload.set('success');
        },
      });
  }
}
