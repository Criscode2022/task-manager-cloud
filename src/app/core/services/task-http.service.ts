import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Task } from '../../tabs/tab-list/types/task';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  private http = inject(HttpClient);
  private snackbar = inject(MatSnackBar);
  private taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  public messageDownload = signal('');
  public loading = signal(false);

  constructor() {
    effect(() => {
      this.autoUpload(this.tasks(), this.taskService.userId());
    });
  }

  public async upload(tasks: Task[], userId?: number): Promise<void> {
    this.loading.set(true);

    const body = {
      userIdParam: userId,
      tasks: tasks,
    };

    this.http
      .post(`${environment.baseUrl}/tasks/insert-tasks`, body)
      .pipe(
        retry(2),
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

          this.loading.set(false);
        },

        error: () => {
          this.loading.set(false);
        },
      });
  }

  public autoUpload(tasks: Task[], userId?: number): void {
    //This method is needed because you can't assign signals in an effect() function
    if (!tasks.length || !userId) {
      return;
    }

    const body = {
      userIdParam: userId,
      tasks: tasks,
    };

    this.http
      .post(`${environment.baseUrl}/tasks/insert-tasks`, body)
      .pipe(
        retry(2),
        catchError((error) => {
          throw error;
        })
      )
      .subscribe({
        error: () => {
          this.snackbar
            .open('Error uploading tasks', 'Retry', {
              duration: 5000,
            })
            .onAction()
            .subscribe(() => {
              this.upload(tasks, userId);
            });
        },
      });
  }

  public delete(userId: number): void {
    this.http
      .delete(`${environment.baseUrl}/tasks/${userId}`)
      .pipe(
        retry(2),
        catchError((error) => {
          throw new Error('Error deleting user Id: ' + error.message);
        })
      )
      .subscribe(() => {
        this.taskService.storage?.remove('userId');
        this.taskService.userId.set(0);
        this.messageDownload.set('');
      });
  }

  public download(userId: number): void {
    this.http
      .get(`${environment.baseUrl}/tasks/${userId}`, {
        observe: 'response',
      })
      .pipe(
        retry(2),
        catchError(async (error) => {
          if (error.status == 404) {
            if (
              (await this.taskService.storage?.get('userId')) &&
              !this.taskService.userId()
            ) {
              // Used to remove the user Id when the app starts if it was deleted from another device
              await this.taskService.storage?.remove('userId');
              return;
            }

            this.messageDownload.set('not found');
          }

          if (error.status == 500) {
            this.messageDownload.set('error');
          }

          throw new Error('Error downloading tasks: ' + error.message);
        })
      )
      .subscribe({
        next: (response: any) => {
          const tasks = response.body.map((task: Task) => ({
            ...task,
            done: !!task.done,
          }));

          this.taskService.storage?.set('userId', userId);
          this.taskService.userId.set(userId);
          this.tasks.set(tasks);

          this.messageDownload.set('success');
        },
      });
  }
}
