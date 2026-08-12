import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DEFAULT_TASK_PRIORITY,
  Task,
  TaskDTO,
} from 'src/app/tabs/tab-list/types/task';
import { AuthSession, NeonApiService } from './neon-api.service';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskNeonService {
  private readonly snackbar = inject(MatSnackBar);
  private readonly taskService = inject(TaskService);
  private readonly neon = inject(NeonApiService);

  private readonly tasks = this.taskService.tasks;

  public async upload(
    task: TaskDTO,
    userId: number,
    token: string,
  ): Promise<void> {
    if (!userId || !token) return;

    const localId = task.id;

    try {
      console.log('Uploading task to Neon...', task, userId);

      const newTask = await this.neon.createTask(
        {
          title: task.title!,
          description: task.description || '',
          done: task.done || false,
          priority: task.priority || DEFAULT_TASK_PRIORITY,
          tags: task.tags || [],
          user_id: userId,
          updated_at: new Date(),
        },
        token,
      );

      console.log('Task uploaded successfully:', newTask);

      if (localId && newTask.id !== localId) {
        this.tasks.update((tasks) =>
          tasks.map((t) => (t.id === localId ? { ...t, id: newTask.id } : t)),
        );
        console.log(`Local task ID updated: ${localId} → ${newTask.id}`);
      }

      this.neon.cloudTasks.reload();
    } catch (error) {
      console.error('Upload error:', error);
      this.snackbar
        .open('Error uploading task, try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.upload(task, userId, token);
        });

      throw error;
    }
  }

  public async editTask(
    task: TaskDTO,
    userId: number,
    token: string,
  ): Promise<void> {
    if (!userId || !task.id || !token) return;

    try {
      console.log('Editing task in Neon...', task, userId);

      const updatedTask = await this.neon.updateTask(
        task.id,
        {
          title: task.title,
          description: task.description,
          done: task.done,
          priority: task.priority,
          tags: task.tags,
          updated_at: new Date(),
        },
        token,
      );

      console.log('Task edited successfully:', updatedTask);
      this.neon.cloudTasks.reload();
    } catch (error) {
      console.error('Edit error:', error);
      this.snackbar
        .open('Error editing task, please try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.editTask(task, userId, token);
        });

      throw error;
    }
  }

  public async deleteTask(
    taskId: number,
    userId: number,
    token: string,
  ): Promise<void> {
    if (!userId || !taskId || !token) return;

    try {
      console.log('Deleting task from Neon...', taskId, userId);
      await this.neon.deleteTask(taskId, token);
      console.log('Task deleted successfully:', taskId);
      this.neon.cloudTasks.reload();
    } catch (error) {
      console.error('Delete error:', error);
      this.snackbar
        .open('Error deleting task, please try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.deleteTask(taskId, userId, token);
        });

      throw error;
    }
  }

  public async createUser(pin: string): Promise<AuthSession | null> {
    try {
      const session = await this.neon.register(pin);
      this.taskService.userId.set(session.id);
      this.snackbar.open('User created successfully', '', {
        duration: 850,
      });
      return session;
    } catch (error) {
      console.error('Error creating user:', error);
      this.snackbar.open('Error creating user', 'Close', {
        duration: 5000,
      });
      return null;
    }
  }

  public async download(pin: string): Promise<AuthSession> {
    console.log('🔐 Logging in with PIN...');
    const session = await this.neon.login(pin);
    this.neon.session.set({ userId: session.id, token: session.token });
    const tasks = await this.neon.waitForTasks();

    this.taskService.userId.set(session.id);
    this.tasks.set(tasks);

    console.log('✅ Tasks downloaded successfully:', tasks.length, 'tasks');
    this.snackbar.open(`Logged in! ${tasks.length} tasks synced`, '', {
      duration: 850,
    });

    return session;
  }

  public async restoreSession(
    userId: number,
    token: string,
  ): Promise<void> {
    this.neon.session.set({ userId, token });
    await this.neon.waitForMe();
    const tasks = await this.neon.waitForTasks();
    this.taskService.userId.set(userId);
    this.tasks.set(tasks);
  }

  public async deleteUser(userId: number, token: string): Promise<void> {
    try {
      await this.neon.deleteUser(userId, token);
      this.taskService.userId.set(0);
      this.tasks.set([]);
      this.snackbar.open('User deleted successfully', '', {
        duration: 850,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      this.snackbar.open('Error deleting user', 'Close', {
        duration: 5000,
      });
      throw error;
    }
  }

  public async bulkUpload(
    tasks: Task[],
    userId: number,
    token: string,
  ): Promise<void> {
    try {
      const tasksToUpload = tasks.map((task) => ({
        title: task.title,
        description: task.description,
        done: task.done,
        priority: task.priority || DEFAULT_TASK_PRIORITY,
        tags: task.tags || [],
        user_id: userId,
        updated_at: new Date(),
      }));

      const uploadedTasks = await this.neon.bulkUploadTasks(
        tasksToUpload,
        token,
      );

      if (uploadedTasks.length === tasks.length) {
        this.tasks.update((currentTasks) => {
          const updated = [...currentTasks];
          for (let i = 0; i < tasks.length; i++) {
            const localId = tasks[i].id;
            const neonId = uploadedTasks[i].id;
            const idx = updated.findIndex((t) => t.id === localId);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], id: neonId };
            }
          }
          return updated;
        });
        console.log('Local task IDs updated after bulk upload');
      }

      console.log('Bulk upload successful');
      this.snackbar.open('Tasks synced successfully', '', {
        duration: 850,
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
      this.snackbar.open('Error syncing tasks', 'Close', {
        duration: 5000,
      });
      throw error;
    }
  }

  public enableRealtimeSync(userId: number): void {
    void userId;
    console.warn('Realtime sync is not supported with Neon.');
  }

  public async disableRealtimeSync(): Promise<void> {
    await this.neon.unsubscribeAll();
  }
}
