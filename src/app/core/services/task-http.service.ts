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

  public async download(id: number): Promise<Task[]> {
    try {
      return new Promise<Task[]>((resolve, reject) => {
        this.http
          .get(`${environment.baseUrl}/tasks/${id}`)
          .pipe(retry(10))
          .subscribe({
            next: (response: any) => {
              const tasks = response.map((task: Task) => ({
                ...task,
                done: task.done ? true : false, // Convert 0/1 from MySQL database to boolean
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
