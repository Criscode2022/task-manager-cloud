import { inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Task } from 'src/app/tabs/tab-list/types/task';
import { PinDialogComponent } from '../../components/pin-dialog/pin-dialog.component';
import { TaskService } from '../task.service';
import { TaskSupabaseService } from '../task-supabase.service';
import { SupabaseService } from '../supabase.service';

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
  private readonly taskService = inject(TaskService);
  private readonly taskSupabaseService = inject(TaskSupabaseService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  public userId = signal(0);
  public enctyptedData = signal<EncryptedData | null>(null);

  public async createUser(): Promise<void> {
    console.log('Creating new user with Supabase...');

    try {
      const tasks = await this.taskService.getTasks();

      // Generate a random PIN (4-6 digits)
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      // In a production app, you would encrypt this PIN properly
      // For now, we'll use a simple approach
      const encryptedPin = btoa(pin); // Base64 encoding (NOT secure for production!)
      const iv = btoa(Date.now().toString());
      const authTag = btoa(Math.random().toString());

      // Create user in Supabase
      const userId = await this.taskSupabaseService.createUser(
        encryptedPin,
        iv,
        authTag
      );

      if (userId) {
        console.log('User created successfully', userId);

        this.taskService.userId?.set(userId);
        this.userId.set(userId);

        const enctryptedData = {
          encryptedPin,
          iv,
          authTag,
        };

        await this.taskService.storage?.set('pin', encryptedPin);
        await this.taskService.storage?.set('iv', iv);
        await this.taskService.storage?.set('authTag', authTag);

        this.enctyptedData.set(enctryptedData);

        // Upload existing tasks if any
        if (tasks.length > 0) {
          await this.taskSupabaseService.bulkUpload(tasks, userId);
        }

        // Show PIN to user
        this.dialog.open(PinDialogComponent, {
          width: '300px',
          data: { pin },
          disableClose: false,
        });

        console.log('set userId', this.taskService.userId());
      } else {
        this.snackbar.open('Failed to create user', 'Close', {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      this.snackbar.open('Error creating user', 'Close', {
        duration: 2000,
      });
    }
  }

  public async getUser(): Promise<void> {
    console.log('Getting user data from Supabase...');

    try {
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

      // Get stored user ID
      const storedUserId = await this.taskService.storage?.get('userId');
      if (!storedUserId) {
        console.log('No user ID found in storage');
        return;
      }

      // Download tasks from Supabase
      await this.taskSupabaseService.download(
        storedUserId,
        encryptedPin,
        iv,
        authTag
      );

      console.log('User data fetched successfully');
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.snackbar.open('Error fetching user data', 'Close', {
        duration: 2000,
      });

      await this.taskService.storage?.remove('authTag');
      await this.taskService.storage?.remove('iv');
      await this.taskService.storage?.remove('pin');
    }
  }

  public async delete(
    userId: number,
    iv: string,
    authTag: string,
    encryptedPin: string
  ): Promise<void> {
    try {
      await this.taskSupabaseService.deleteUser(userId);

      await this.taskService.storage?.remove('authTag');
      await this.taskService.storage?.remove('iv');
      await this.taskService.storage?.remove('pin');
      await this.taskService.storage?.remove('userId');

      this.taskService.userId.set(0);
      this.userId.set(0);

      this.snackbar.open('User deleted successfully', 'Close', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      this.snackbar.open('Error deleting user', 'Close', {
        duration: 5000,
      });
      throw new Error('Error deleting user Id: ' + error);
    }
  }
}
