import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from '../../tabs/tab-list/types/task';

interface NeonUser {
  id: number;
  pin_hash: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class NeonApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor() {
    console.log('🔧 Neon API Configuration:');
    console.log('  API Base URL:', this.baseUrl);
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // ===========================
  // TASK OPERATIONS
  // ===========================

  async getTasks(userId: number): Promise<Task[]> {
    return firstValueFrom(
      this.http.get<Task[]>(this.url(`/tasks`), {
        params: { userId: String(userId) },
      }),
    );
  }

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    return firstValueFrom(this.http.post<Task>(this.url('/tasks'), task));
  }

  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
    return firstValueFrom(
      this.http.put<Task>(this.url(`/tasks/${taskId}`), updates),
    );
  }

  async deleteTask(taskId: number): Promise<void> {
    await firstValueFrom(this.http.delete(this.url(`/tasks/${taskId}`)));
  }

  async deleteAllTasks(userId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(this.url('/tasks'), {
        params: { userId: String(userId) },
      }),
    );
  }

  async bulkUploadTasks(
    tasks: Omit<Task, 'id' | 'created_at'>[],
  ): Promise<Task[]> {
    return firstValueFrom(
      this.http.post<Task[]>(this.url('/tasks/bulk'), { tasks }),
    );
  }

  // ===========================
  // USER OPERATIONS
  // ===========================

  async createUser(pinHash: string): Promise<number> {
    console.log(
      '👤 Creating new user with PIN hash (first 20 chars):',
      pinHash.substring(0, 20) + '...',
    );

    const data = await firstValueFrom(
      this.http.post<NeonUser>(this.url('/users'), { pin_hash: pinHash }),
    );

    console.log('✅ User created successfully with ID:', data.id);
    return data.id;
  }

  async getUser(userId: number): Promise<NeonUser> {
    return firstValueFrom(
      this.http.get<NeonUser>(this.url(`/users/${userId}`)),
    );
  }

  async getUserByPinHash(pinHash: string): Promise<NeonUser> {
    console.log('🔍 Looking up user by PIN hash...');
    const data = await firstValueFrom(
      this.http.get<NeonUser>(
        this.url(`/users/by-pin/${encodeURIComponent(pinHash)}`),
      ),
    );
    console.log('✅ User found with ID:', data.id);
    return data;
  }

  async verifyUserPin(userId: number, pinHash: string): Promise<boolean> {
    console.log('🔐 Verifying PIN for User ID:', userId);
    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean }>(this.url(`/users/${userId}/verify`), {
          pin_hash: pinHash,
        }),
      );
      console.log('🔐 PIN hashes match:', result.valid);
      return result.valid;
    } catch (error) {
      console.error('❌ Error verifying user PIN:', error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    await this.deleteAllTasks(userId);
    await firstValueFrom(this.http.delete(this.url(`/users/${userId}`)));
  }

  /**
   * Realtime sync is not available with Neon via the REST API.
   * Kept as a no-op for API compatibility with previous Supabase wiring.
   */
  subscribeToTasks(userId: number, callback: (payload: unknown) => void) {
    void userId;
    void callback;
    console.warn('Realtime sync is not supported with the Neon API adapter.');
    return { unsubscribe: () => undefined };
  }

  async unsubscribeAll(): Promise<void> {
    // no-op
  }
}
