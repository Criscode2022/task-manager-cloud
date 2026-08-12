import { inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PinDialogComponent } from '../../components/pin-dialog/pin-dialog.component';
import { AuthSession, NeonApiService } from '../neon-api.service';
import { PinHashService } from '../pin-hash.service';
import { TaskNeonService } from '../task-neon.service';
import { TaskService } from '../task.service';

const SESSION_TOKEN_KEY = 'accessToken';
const SESSION_EXPIRES_KEY = 'sessionExpiresAt';
const SESSION_USER_KEY = 'userId';
const LEGACY_PIN_HASH_KEY = 'pinHash';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly taskService = inject(TaskService);
  private readonly taskNeonService = inject(TaskNeonService);
  private readonly neonApi = inject(NeonApiService);
  private readonly pinHashService = inject(PinHashService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);

  public userId = signal(0);
  /** @deprecated Use accessToken — kept temporarily for call-site migration */
  public pinHash = signal<string | null>(null);
  public accessToken = signal<string | null>(null);
  public sessionExpiresAt = signal<string | null>(null);

  private async persistSession(session: AuthSession): Promise<void> {
    await this.taskService.storage?.set(SESSION_TOKEN_KEY, session.token);
    await this.taskService.storage?.set(
      SESSION_EXPIRES_KEY,
      session.expires_at,
    );
    await this.taskService.storage?.set(SESSION_USER_KEY, session.id);
    // Remove legacy permanent credential if present
    await this.taskService.storage?.remove(LEGACY_PIN_HASH_KEY);

    this.taskService.userId?.set(session.id);
    this.userId.set(session.id);
    this.accessToken.set(session.token);
    this.sessionExpiresAt.set(session.expires_at);
    this.pinHash.set(null);
  }

  public async clearSession(): Promise<void> {
    await this.taskService.storage?.remove(SESSION_TOKEN_KEY);
    await this.taskService.storage?.remove(SESSION_EXPIRES_KEY);
    await this.taskService.storage?.remove(SESSION_USER_KEY);
    await this.taskService.storage?.remove(LEGACY_PIN_HASH_KEY);

    this.taskService.userId.set(0);
    this.userId.set(0);
    this.accessToken.set(null);
    this.sessionExpiresAt.set(null);
    this.pinHash.set(null);
    this.neonApi.clearSession();
  }

  private isExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
  }

  /**
   * Create a new user; server hashes the PIN and returns a short-lived JWT.
   */
  public async createUser(): Promise<void> {
    console.log('Creating new user with Neon...');

    try {
      const tasks = await this.taskService.getTasks();
      const pin = this.pinHashService.generatePin();
      const session = await this.taskNeonService.createUser(pin);

      if (session) {
        await this.persistSession(session);

        if (tasks.length > 0) {
          await this.taskNeonService.bulkUpload(
            tasks,
            session.id,
            session.token,
          );
        }

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
   * Restore a short-lived session from storage (auto-login).
   */
  public async getUser(): Promise<void> {
    console.log('🔄 Checking for existing session...');

    try {
      // Migrate away from legacy permanent pinHash sessions
      const legacyPinHash = await this.taskService.storage?.get(
        LEGACY_PIN_HASH_KEY,
      );
      if (legacyPinHash) {
        console.log(
          '🧹 Clearing legacy pinHash session — please log in again with your PIN',
        );
        await this.clearSession();
        return;
      }

      const token = await this.taskService.storage?.get(SESSION_TOKEN_KEY);
      const expiresAt = await this.taskService.storage?.get(SESSION_EXPIRES_KEY);
      const userId = await this.taskService.storage?.get(SESSION_USER_KEY);

      if (!token || !userId || this.isExpired(expiresAt)) {
        console.log('❌ No valid session found');
        if (token || userId || expiresAt) {
          await this.clearSession();
        }
        return;
      }

      console.log('✅ Session found, restoring...');
      await this.taskNeonService.restoreSession(Number(userId), token);
      this.userId.set(Number(userId));
      this.accessToken.set(token);
      this.sessionExpiresAt.set(expiresAt);
      console.log('✅ Auto-login successful');
    } catch (error) {
      console.error('❌ Auto-login failed:', error);
      await this.clearSession();
      console.log('🧹 Session cleared due to error');
    }
  }

  public async loginWithPin(pin: string): Promise<void> {
    const session = await this.taskNeonService.download(pin);
    await this.persistSession(session);
  }

  public async logout(): Promise<void> {
    const token = this.accessToken();
    if (token) {
      try {
        await this.neonApi.logout(token);
      } catch (error) {
        console.warn('Server logout failed; clearing local session anyway', error);
      }
    }
    await this.clearSession();
    this.taskService.tasks.set([]);
  }

  /**
   * Delete user account and all associated data
   */
  public async delete(userId: number): Promise<void> {
    try {
      const token = this.accessToken();
      if (!token) {
        throw new Error('Missing session credentials');
      }
      await this.taskNeonService.deleteUser(userId, token);
      await this.clearSession();

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
