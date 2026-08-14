import { httpResource } from '@angular/common/http';
import { HttpClient, HttpHeaders, HttpResourceRef } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
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

  /** Session for reactive GET reads (`httpResource`). Mutations stay on HttpClient. */
  readonly session = signal<{ userId: number; token: string } | null>(null);

  readonly cloudTasks = httpResource<Task[]>(
    () => {
      const session = this.session();
      if (!session) {
        return undefined;
      }

      return {
        url: this.url('/tasks'),
        method: 'GET',
        params: { userId: String(session.userId) },
        headers: { Authorization: `Bearer ${session.token}` },
      };
    },
    { defaultValue: [] },
  );

  readonly meResource = httpResource<NeonUser>(() => {
    const session = this.session();
    if (!session) {
      return undefined;
    }

    return {
      url: this.url('/auth/me'),
      method: 'GET',
      headers: { Authorization: `Bearer ${session.token}` },
    };
  });

  constructor() {
    console.log('🔧 Neon API Configuration:');
    console.log('  API Base URL:', this.baseUrl);
  }

  clearSession(): void {
    this.session.set(null);
  }

  async waitForTasks(): Promise<Task[]> {
    this.cloudTasks.reload();
    await this.waitForResource(this.cloudTasks);
    return this.cloudTasks.value() ?? [];
  }

  async waitForMe(): Promise<NeonUser> {
    this.meResource.reload();
    await this.waitForResource(this.meResource);
    const user = this.meResource.value();
    if (!user) {
      throw new Error('Session is not valid');
    }
    return user;
  }

  private async waitForResource<T>(
    resource: HttpResourceRef<T>,
  ): Promise<void> {
    if (resource.status() === 'loading' || resource.status() === 'reloading' || resource.status() === 'idle') {
      await firstValueFrom(
        toObservable(resource.status).pipe(
          filter((status) => status === 'resolved' || status === 'error'),
          take(1),
        ),
      );
    }

    const error = resource.error();
    if (error) {
      throw error;
    }
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
    this.session.set({
      userId: this.session()?.userId ?? 0,
      token,
    });
    return this.waitForMe();
  }

  // ===========================
  // TASK OPERATIONS
  // ===========================

  async getTasks(userId: number, token: string): Promise<Task[]> {
    this.session.set({ userId, token });
    return this.waitForTasks();
  }

  async createTask(
    task: Pick<Task, 'title' | 'description' | 'done' | 'priority' | 'tags'>,
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
    tasks: Pick<Task, 'title' | 'description' | 'done' | 'priority' | 'tags'>[],
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
