import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, retry, take, throwError } from 'rxjs';
import { Task } from 'src/app/tabs/tab-list/types/task';
import { environment } from 'src/environments/environment.prod';
import { PinDialogComponent } from '../../components/pin-dialog/pin-dialog.component';
import { TaskService } from '../task.service';

interface UserResponse {
  userId: number;
  pin: string;
  encryptedPin: string;
  iv: string;
  authTag: string;
  tasks: Task[];
}

interface EncryptedData {
  encryptedPin: string;
  iv: string;
  authTag: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly taskService = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  public userId = signal(0);
  public enctyptedData = signal<EncryptedData | null>(null);

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

          console.log(response);

          const enctryptedData = {
            encryptedPin: response.encryptedPin,
            iv: response.iv,
            authTag: response.authTag,
          };

          this.taskService.storage?.set('pin', enctryptedData?.encryptedPin);
          this.taskService.storage?.set('iv', enctryptedData?.iv);
          this.taskService.storage?.set('authTag', enctryptedData?.authTag);

          this.enctyptedData.set(enctryptedData);

          this.dialog.open(PinDialogComponent, {
            width: '300px',
            data: { pin: response?.pin },
            disableClose: false,
          });

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
    const encryptedPin = await this.taskService?.storage?.get('pin');

    this.enctyptedData.set({ encryptedPin, iv, authTag });

    console.log('encryptedPin,', encryptedPin);
    console.log('iv,', iv);
    console.log('authTag,', authTag);

    if (!authTag || !iv || !encryptedPin) {
      console.log('No user data found.');
      return;
    }

    console.log('data found, fetching user...', { authTag, iv, encryptedPin });

    this.http
      .post<UserResponse>(`${environment.baseUrl}/get-user`, {
        authTag,
        iv,
        encryptedPin: encryptedPin,
      })
      .pipe(
        retry(2),
        take(1),
        catchError((error) => {
          this.snackbar.open('Error fetching user data', 'Close', {
            duration: 2000,
          });

          this.taskService.storage?.remove('authTag');
          this.taskService.storage?.remove('iv');
          this.taskService.storage?.remove('pin');

          return throwError(() => error);
        })
      )
      .subscribe((response: UserResponse) => {
        console.log('response', response);

        console.log('User data fetched successfully', response);

        const userId = response?.userId;

        const tasks = response?.tasks;

        if (!tasks.length) {
          throw new Error('No tasks found for user');
        }

        this.taskService.tasks.set(tasks);

        console.log('fetched userId', userId);
        this.taskService.userId?.set(userId);
        this.userId.set(userId);

        console.log('set userId', this.taskService.userId());
      });
  }

  public delete(
    userId: number,
    iv: string,
    authTag: string,
    encryptedPin: string
  ): void {
    this.http
      .delete(`${environment.baseUrl}/user`, {
        body: {
          encryptedPin,
          iv,
          authTag,
          userId,
        },
      })
      .pipe(
        retry(2),
        catchError((error) => {
          throw new Error('Error deleting user Id: ' + error.message);
        })
      )
      .subscribe(async () => {
        await this.taskService.storage?.remove('authTag');
        await this.taskService.storage?.remove('iv');
        await this.taskService.storage?.remove('pin');

        this.taskService.userId.set(0);

        this.snackbar.open('User deleted successfully', 'Close', {
          duration: 5000,
        });
      });
  }
}
