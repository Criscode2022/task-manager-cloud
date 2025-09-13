import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, retry, take, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { TaskService } from '../task.service';

interface UserResponse {
  userId: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly taskService = inject(TaskService);
  private readonly snackbar = inject(MatSnackBar);

  public userId = signal(0);

  public async createUser(): Promise<void> {
    console.log('Creating new user...');

    const tasks = await this.taskService.getTasks();

    this.http
      .post<UserResponse>(`${environment.baseUrl}/create-user`, { tasks })
      .pipe(
        retry(2),
        take(1),
        catchError((error) => {
          this.snackbar.open('Error creating user', 'Close', {
            duration: 2000,
          });
          return throwError(() => error);
        })
      )
      .subscribe(async (response: UserResponse) => {
        console.log('response', response);

        if (response && response.userId) {
          console.log('User created successfully', response);

          const userId = response?.userId;

          console.log('created userId', userId);
          this.taskService.userId?.set(userId);
          this.userId.set(userId);

          console.log('set userId', this.taskService.userId());
        } else {
          this.snackbar.open('Failed to create user', 'Close', {
            duration: 2000,
          });
        }
      });
  }

  public async getUser(): Promise<UserResponse | void> {
    console.log('Getting user data...');
    const authTag = await this.taskService.storage?.get('authTag');
    const iv = await this.taskService.storage?.get('iv');
    const pin = await this.taskService?.storage?.get('pin');

    if (!authTag || !iv || !pin) {
      console.log('No user data found.');
      return;
    }

    console.log('data found, fetching user...', { authTag, iv, pin });

    this.http
      .post<UserResponse>(`${environment.baseUrl}/get-user`, {
        authTag,
        iv,
        encryptedPin: pin,
      })
      .pipe(
        retry(2),
        take(1),
        catchError((error) => {
          this.snackbar.open('Error fetching user data', 'Close', {
            duration: 2000,
          });
          return throwError(() => error);
        })
      )
      .subscribe((response: UserResponse) => {
        console.log('response', response);

        if (response && response.userId) {
          console.log('User data fetched successfully', response);

          const userId = response?.userId;

          console.log('fetched userId', userId);
          this.taskService.userId?.set(userId);
          this.userId.set(userId);

          console.log('set userId', this.taskService.userId());
        } else {
          this.snackbar.open('Failed to fetch user data', 'Close', {
            duration: 2000,
          });

          this.taskService.storage?.remove('authTag');
          this.taskService.storage?.remove('iv');
          this.taskService.storage?.remove('pin');
        }
      });
  }
}
