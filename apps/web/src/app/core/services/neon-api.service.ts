import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from '../../tabs/tab-list/types/task';

export interface AuthSession {
  id: number;
  token: string;
  expires_at: string;
  expires_in: number;
}

interface NeonUser {
  id: number;
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

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ===========================
  // AUTH
  // ===========================

  async register(pin: string): Promise<AuthSession> {
    return firstValueFrom(
      this.http.post<AuthSession>(this.url('/users'), { pin }),
    );
  }

  async login(pin: string): Promise<AuthSession> {
    return firstValueFrom(
      this.http.post<AuthSession>(this.url('/auth/login'), { pin }),
    );
  }

  async logout(token: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        this.url('/auth/logout'),
        {},
        { headers: this.authHeaders(token) },
      ),
    );
  }

  async me(token: string): Promise<NeonUser> {
    return firstValueFrom(
      this.http.get<NeonUser>(this.url('/auth/me'), {
        headers: this.authHeaders(token),
      }),
    );
  }

  // ===========================
  // TASK OPERATIONS
  // ===========================

  async getTasks(userId: number, token: string): Promise<Task[]> {
    return firstValueFrom(
      this.http.get<Task[]>(this.url(`/tasks`), {
        params: { userId: String(userId) },
        headers: this.authHeaders(token),
      }),
    );
  }

  async createTask(
    task: Omit<Task, 'id' | 'created_at'>,
    token: string,
  ): Promise<Task> {
    return firstValueFrom(
      this.http.post<Task>(this.url('/tasks'), task, {
        headers: this.authHeaders(token),
      }),
    );
  }

  async updateTask(
    taskId: number,
    updates: Partial<Task>,
    token: string,
  ): Promise<Task> {
    return firstValueFrom(
      this.http.put<Task>(this.url(`/tasks/${taskId}`), updates, {
        headers: this.authHeaders(token),
      }),
    );
  }

  async deleteTask(taskId: number, token: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(this.url(`/tasks/${taskId}`), {
        headers: this.authHeaders(token),
      }),
    );
  }

  async deleteAllTasks(userId: number, token: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(this.url('/tasks'), {
        params: { userId: String(userId) },
        headers: this.authHeaders(token),
      }),
    );
  }

  async bulkUploadTasks(
    tasks: Omit<Task, 'id' | 'created_at'>[],
    token: string,
  ): Promise<Task[]> {
    return firstValueFrom(
      this.http.post<Task[]>(
        this.url('/tasks/bulk'),
        { tasks },
        { headers: this.authHeaders(token) },
      ),
    );
  }

  async getUser(userId: number, token: string): Promise<NeonUser> {
    return firstValueFrom(
      this.http.get<NeonUser>(this.url(`/users/${userId}`), {
        headers: this.authHeaders(token),
      }),
    );
  }

  async deleteUser(userId: number, token: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(this.url(`/users/${userId}`), {
        headers: this.authHeaders(token),
      }),
    );
  }

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
