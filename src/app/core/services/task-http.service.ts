import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Task } from 'src/app/tabs/tab-list/types/task';
import { environment } from 'src/environments/environment.prod';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  public loading = signal(false);

  constructor() {
    effect(() => {
      this.autoUpload(this.tasks(), this.taskService.userId());
    });
  }

  public async upload(tasks: Task[], userId?: number): Promise<void> {
    try {
      this.loading.set(true);

      const body = {
        userIdParam: userId,
        tasks: tasks,
      };

      if (!tasks.length) {
        this.loading.set(false);

        this.snackbar.open('There are no tasks to upload', 'Close', {
          duration: 1000,
        });

        return;
      }

      const response = await firstValueFrom<{ user_id: number }>(
        this.http
          .post<{ user_id: number }>(
            `${environment.baseUrl}/insert-tasks`,
            body
          )
          .pipe(retry(2))
      );

      if (!userId) {
        this.taskService.userId.set(response['user_id']);
      } else {
        this.taskService.userId.set(userId);
      }

      this.loading.set(false);
    } catch (error) {
      this.loading.set(false);

      this.snackbar.open('Error uploading tasks, try again later', 'Close', {
        duration: 5000,
      });

      throw error;
    }
  }

  //This method is needed because you can't assign signals in an effect() function
  public autoUpload(tasks: Task[], userId?: number): void {
    if (!userId) {
      return;
    }

    const body = {
      userIdParam: userId,
      tasks: tasks,
    };

    this.http
      .post(`${environment.baseUrl}/insert-tasks`, body)
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
      });
  }

  public download(pin: number): void {
    this.loading.set(true);

    this.http
      .get(`${environment.baseUrl}/tasks/${pin}`, {
        observe: 'response',
      })
      .pipe(
        retry(2),
        catchError(async (error) => {
          this.loading.set(false);

          if (error.status == 404) {
            if (
              (await this.taskService.storage?.get('userId')) &&
              !this.taskService.userId()
            ) {
              // Used to remove the user Id when the app starts if it was deleted from another device
              await this.taskService.storage?.remove('userId');
              return;
            }

            if (this.router.url !== '/tabs/list') {
              this.snackbar.open('User ID not found', 'Close', {
                duration: 5000,
              });
            }
          } else {
            this.snackbar.open('Server error, try again later', 'Close', {
              duration: 5000,
            });

            throw error;
          }
        })
      )
      .subscribe({
        next: (response: any) => {
          if (!response) {
            this.loading.set(false);

            this.taskService.userId.set(pin);

            return;
          }

          console.log(response);

          const tasks = response?.body?.tasks.map((task: Task) => ({
            ...task,
            done: !!task.done,
          }));

          this.taskService.storage?.set('pin', response?.body?.encryptedPin);
          this.taskService.storage?.set('iv', response?.body?.iv);
          this.taskService.storage?.set('authTag', response?.body?.authTag);

          this.taskService.userId.set(pin);
          this.tasks.set(tasks);

          this.loading.set(false);

          this.snackbar.open('Tasks downloaded successfully', '', {
            duration: 850,
          });
        },
      });
  }
}
