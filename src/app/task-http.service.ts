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

    this.http.post('http://localhost:3000/insert-tasks', tasks).subscribe(
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
        .get(`http://localhost:3000/tasks/${userId}`)
        .subscribe((response: any) => {
          this.loading = false;
          this.taskService.saveTasks(response);
          window.location.reload();
        });
    } catch (error) {
    } finally {
      this.loading = false;
    }
  }
}
