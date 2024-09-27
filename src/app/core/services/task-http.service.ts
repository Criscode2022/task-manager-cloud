import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { catchError, retry } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { Task } from '../../tab-list/types/Task';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  private http = inject(HttpClient);
  private taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  public messageDownload = signal<string | null>(null);
  public loading = signal(false);

  constructor() {
    effect(() => {
      if (this.tasks()) {
        const userId = this.taskService.userId();
        if (!userId) {
          return;
        }

        this.autoUpload(this.tasks(), userId);
      }
    });
  }

  public async upload(tasks: Task[], userId?: number) {
    this.loading.set(true);

    const body = {
      userIdParam: userId,
      tasks: tasks,
    };

    this.http
      .post(`${environment.baseUrl}/insert-tasks`, body)
      .pipe(
        retry(10),
        catchError((error) => {
          throw error;
        })
      )
      .subscribe({
        next: (response: any) => {
          if (!userId) {
            this.taskService.userId.set(response['userid']);
          } else {
            this.taskService.userId.set(userId);
          }
        },

        error: () => {
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  public autoUpload(tasks: Task[], userId?: number) {
    const body = {
      userIdParam: userId,
      tasks: tasks,
    };

    this.http
      .post(`${environment.baseUrl}/insert-tasks`, body)
      .pipe(
        retry(10),
        catchError((error) => {
          throw error;
        })
      )
      .subscribe();
  }

  public download(userId: number) {
    this.http
      .get(`https://api-task-i35c.onrender.com/tasks/${userId}`, {
        observe: 'response',
      })
      .pipe(
        retry(10),
        catchError((error) => {
          if (error.status == 404) {
            this.messageDownload.set('not found');
          }

          if (error.status == 500) {
            this.messageDownload.set('error');
          }

          throw new Error('Error downloading tasks: ' + error);
        })
      )
      .subscribe({
        next: (response: any) => {
          const tasks = response.body.map((task: Task) => ({
            ...task,
            done: !!task.done,
          }));

          this.taskService._storage?.set('userId', userId);
          this.taskService.userId.set(userId);
          this.tasks.set(tasks);

          this.messageDownload.set('success');
        },
      });
  }
}
