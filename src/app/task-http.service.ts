import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from './types/Task';

@Injectable({
  providedIn: 'root',
})
export class TaskHttpService {
  public userId = new BehaviorSubject<number | null>(null);

  private http = inject(HttpClient);

  public loading = false;

  async upload(tasks: Task[]) {
    this.loading = true;
    console.log('Uploading tasks from http...');

    this.http.post('http://localhost:3000/insert-tasks', tasks).subscribe(
      (response: any) => {
        this.loading = false;
        this.userId.next(response['userid']);
        console.log('Response from server:', response);
        console.log('User ID:', this.userId);
      },
      (error) => {
        console.error('Error uploading tasks:', error);
      }
    );
  }
}
