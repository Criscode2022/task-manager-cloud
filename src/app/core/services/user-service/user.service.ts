import { inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PinDialogComponent } from '../../components/pin-dialog/pin-dialog.component';
import { PinHashService } from '../pin-hash.service';
import { TaskNeonService } from '../task-neon.service';
import { TaskService } from '../task.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly taskService = inject(TaskService);
  private readonly taskNeonService = inject(TaskNeonService);
  private readonly pinHashService = inject(PinHashService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  public userId = signal(0);
  public pinHash = signal<string | null>(null);

  /**
   * Create a new user with a securely hashed PIN
   */
  public async createUser(): Promise<void> {
    console.log('Creating new user with Neon...');

    try {
      const tasks = await this.taskService.getTasks();

      // Generate a random 4-digit PIN
      const pin = this.pinHashService.generatePin();

      // Hash the PIN securely using SHA-256
      const hashedPin = await this.pinHashService.hashPin(pin);

      // Create user in Neon
      const userId = await this.taskNeonService.createUser(hashedPin);

      if (userId) {
        console.log('User created successfully', userId);

        this.taskService.userId?.set(userId);
        this.userId.set(userId);

        // Store PIN hash locally
        await this.taskService.storage?.set('pinHash', hashedPin);
        this.pinHash.set(hashedPin);

        // Upload existing tasks if any
        if (tasks.length > 0) {
          await this.taskNeonService.bulkUpload(tasks, userId);
        }

        // Show PIN to user (they need to save this!)
        this.dialog.open(PinDialogComponent, {
          width: '90vw',
          maxWidth: '500px',
          maxHeight: '90vh',
          data: { pin },
          disableClose: true,
          autoFocus: false,
        });

        console.log('User ID set:', this.taskService.userId());
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

  /**
   * Get user data and download tasks from Neon (auto-login on page load)
   */
  public async getUser(): Promise<void> {
    console.log('🔄 Checking for existing session...');

    try {
      const storedPinHash = await this.taskService.storage?.get('pinHash');

      if (!storedPinHash) {
        console.log('❌ No session found (PIN hash not in storage)');
        return;
      }

      console.log('✅ Session found, logging in automatically...');

      // Download tasks using stored PIN hash (this validates the session)
      await this.taskNeonService.download(storedPinHash);

      this.pinHash.set(storedPinHash);
      console.log('✅ Auto-login successful');
    } catch (error) {
      console.error('❌ Auto-login failed:', error);

      // Clean up invalid session data
      await this.taskService.storage?.remove('pinHash');
      await this.taskService.storage?.remove('userId');

      console.log('🧹 Session cleared due to error');
    }
  }

  /**
   * Delete user account and all associated data
   */
  public async delete(userId: number): Promise<void> {
    try {
      await this.taskNeonService.deleteUser(userId);

      // Clean up all stored data
      await this.taskService.storage?.remove('pinHash');
      await this.taskService.storage?.remove('userId');

      this.taskService.userId.set(0);
      this.userId.set(0);
      this.pinHash.set(null);

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
