import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, retry } from 'rxjs/operators';
import { Task, TaskDTO } from 'src/app/tabs/tab-list/types/task';
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

  // constructor() {
  //   effect(() => {
  //     this.autoUpload(this.tasks(), this.taskService.userId());
  //   });
  // }

  public async upload(
    task: TaskDTO,
    userId: number,
    iv: string,
    authTag: string,
    encryptedPin: string
  ): Promise<void> {
    if (!userId) return;

    try {
      this.loading.set(true);

      // if (!tasks.length) {
      //   this.loading.set(false);

      //   this.snackbar.open('There are no tasks to upload', 'Close', {
      //     duration: 1000,
      //   });

      //   return;
      // }

      console.log('Uploading tasks to server...', task, userId);

      this.http
        .post<any>(`${environment.baseUrl}/insert-tasks`, {
          task,
          iv,
          authTag,
          encryptedPin,
          userId,
        })
        .pipe(
          retry(2),
          catchError((error) => {
            console.error('Upload error:', error);
            throw error;
          })
        )
        .subscribe();

      // if (!userId) {
      //   this.taskService.userId.set(response['user_id']);
      // } else {
      //   this.taskService.userId.set(userId);
      // }

      this.loading.set(false);
    } catch (error) {
      this.loading.set(false);

      this.snackbar
        .open('Error uploading tasks, try again later', 'Close', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.upload(
            task,
            this.taskService.userId(),
            iv,
            authTag,
            encryptedPin
          );
        });

      throw error;
    }
  }

  public async editTask(
    task: TaskDTO,
    userId: number,
    iv: string,
    authTag: string,
    encryptedPin: string
  ): Promise<void> {
    if (!userId) return;

    try {
      this.loading.set(true);

      // if (!tasks.length) {
      //   this.loading.set(false);

      //   this.snackbar.open('There are no tasks to upload', 'Close', {
      //     duration: 1000,
      //   });

      //   return;
      // }

      console.log('Uploading tasks to server...', task, userId);

      this.http
        .put<any>(`${environment.baseUrl}/edit`, {
          task,
          iv,
          authTag,
          encryptedPin,
          userId,
        })
        .pipe(
          retry(2),
          catchError((error) => {
            console.error('Upload error:', error);
            throw error;
          })
        )
        .subscribe();

      // if (!userId) {
      //   this.taskService.userId.set(response['user_id']);
      // } else {
      //   this.taskService.userId.set(userId);
      // }

      this.loading.set(false);
    } catch (error) {
      this.loading.set(false);

      this.snackbar
        .open('Error uploading tasks, try again later', 'Close', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.upload(
            task,
            this.taskService.userId(),
            iv,
            authTag,
            encryptedPin
          );
        });

      throw error;
    }
  }

  public createUser(): void {
    this.http
      .post<any>(`${environment.baseUrl}/create-user`, this.tasks())
      .pipe(
        retry(2),
        catchError((error) => {
          this.snackbar.open('Error creating user', 'Close', {
            duration: 5000,
          });
          throw error;
        })
      )
      .subscribe((response) => {
        if (response && response['user_id']) {
          this.taskService.userId.set(response['user_id']);
          this.snackbar.open('User created successfully', '', {
            duration: 850,
          });
        } else {
          this.snackbar.open('Error creating user', 'Close', {
            duration: 5000,
          });
        }
      });
  }

  ///This method is needed because you can't assign signals in an effect() function

  // public autoUpload(tasks: Task[], userId?: number): void {
  //   if (!userId) {
  //     return;
  //   }

  //   const body = {
  //     userIdParam: userId,
  //     tasks: tasks,
  //   };

  //   this.http
  //     .post(`${environment.baseUrl}/insert-tasks`, body)
  //     .pipe(
  //       retry(2),
  //       catchError((error) => {
  //         this.snackbar
  //           .open('Error uploading tasks', 'Retry', {
  //             duration: 5000,
  //           })
  //           .onAction()
  //           .subscribe(() => {
  //             this.upload(task);
  //           });
  //         throw error;
  //       })
  //     )
  //     .subscribe({
  //       error: () => {
  //         this.snackbar
  //           .open('Error uploading tasks', 'Retry', {
  //             duration: 5000,
  //           })
  //           .onAction()
  //           .subscribe(() => {
  //             this.upload(tasks, userId);
  //           });
  //       },
  //     });
  // }

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

          console.log(tasks, 'tasks to set');
          this.tasks.set(tasks);

          console.log(tasks);

          this.loading.set(false);

          this.snackbar.open('Tasks downloaded successfully', '', {
            duration: 850,
          });
        },
      });
  }
}
