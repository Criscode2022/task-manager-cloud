import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  DEFAULT_TASK_PRIORITY,
  Task,
  TaskDTO,
} from 'src/app/tabs/tab-list/types/task';
import { NeonApiService } from './neon-api.service';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root',
})
export class TaskNeonService {
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private taskService = inject(TaskService);
  private neon = inject(NeonApiService);

  private tasks = this.taskService.tasks;

  /**
   * Upload/Create a new task to Neon
   */
  public async upload(
    task: TaskDTO,
    userId: number,
    pinHash: string,
  ): Promise<void> {
    if (!userId) return;

    const localId = task.id;

    try {
      console.log('Uploading task to Neon...', task, userId);

      const isValidUser = await this.neon.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      const newTask = await this.neon.createTask({
        title: task.title!,
        description: task.description || '',
        done: task.done || false,
        priority: task.priority || DEFAULT_TASK_PRIORITY,
        tags: task.tags || [],
        user_id: userId,
        updated_at: new Date(),
      });

      console.log('Task uploaded successfully:', newTask);

      if (localId && newTask.id !== localId) {
        this.tasks.update((tasks) =>
          tasks.map((t) => (t.id === localId ? { ...t, id: newTask.id } : t)),
        );
        console.log(`Local task ID updated: ${localId} → ${newTask.id}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.snackbar
        .open('Error uploading task, try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.upload(task, userId, pinHash);
        });

      throw error;
    }
  }

  /**
   * Edit an existing task in Neon
   */
  public async editTask(
    task: TaskDTO,
    userId: number,
    pinHash: string,
  ): Promise<void> {
    if (!userId || !task.id) return;

    try {
      console.log('Editing task in Neon...', task, userId);

      const isValidUser = await this.neon.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      const updatedTask = await this.neon.updateTask(task.id, {
        title: task.title,
        description: task.description,
        done: task.done,
        priority: task.priority,
        tags: task.tags,
        updated_at: new Date(),
      });

      console.log('Task edited successfully:', updatedTask);
    } catch (error) {
      console.error('Edit error:', error);
      this.snackbar
        .open('Error editing task, please try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.editTask(task, userId, pinHash);
        });

      throw error;
    }
  }

  /**
   * Delete a task from Neon
   */
  public async deleteTask(
    taskId: number,
    userId: number,
    pinHash: string,
  ): Promise<void> {
    if (!userId || !taskId) return;

    try {
      console.log('Deleting task from Neon...', taskId, userId);

      const isValidUser = await this.neon.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      await this.neon.deleteTask(taskId);

      console.log('Task deleted successfully:', taskId);
    } catch (error) {
      console.error('Delete error:', error);
      this.snackbar
        .open('Error deleting task, please try again later', 'Retry', {
          duration: 5000,
        })
        .onAction()
        .subscribe(() => {
          this.deleteTask(taskId, userId, pinHash);
        });

      throw error;
    }
  }

  /**
   * Create a new user with hashed PIN
   */
  public async createUser(pinHash: string): Promise<number | null> {
    try {
      const userId = await this.neon.createUser(pinHash);

      this.taskService.userId.set(userId);
      this.snackbar.open('User created successfully', '', {
        duration: 850,
      });

      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      this.snackbar.open('Error creating user', 'Close', {
        duration: 5000,
      });
      return null;
    }
  }

  /**
   * Download all tasks for a user from Neon (PIN-only login)
   */
  public async download(pinHash: string): Promise<void> {
    try {
      console.log('🔐 Logging in with PIN...');

      const user = await this.neon.getUserByPinHash(pinHash);

      if (!user) {
        this.snackbar.open('Invalid PIN. Please try again.', 'Close', {
          duration: 5000,
        });
        return;
      }

      console.log('✅ User authenticated:', user.id);

      const tasks = await this.neon.getTasks(user.id);

      await this.taskService.storage?.set('pinHash', pinHash);
      await this.taskService.storage?.set('userId', user.id);

      this.taskService.userId.set(user.id);
      this.tasks.set(tasks);

      console.log('✅ Tasks downloaded successfully:', tasks.length, 'tasks');
      this.snackbar.open(`Logged in! ${tasks.length} tasks synced`, '', {
        duration: 850,
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      this.snackbar.open('Invalid PIN or server error', 'Close', {
        duration: 5000,
      });
      throw error;
    }
  }

  /**
   * Delete user and all their tasks
   */
  public async deleteUser(userId: number): Promise<void> {
    try {
      await this.neon.deleteUser(userId);
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

  /**
   * Bulk upload local tasks to Neon (for initial sync)
   */
  public async bulkUpload(tasks: Task[], userId: number): Promise<void> {
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

      const uploadedTasks = await this.neon.bulkUploadTasks(tasksToUpload);

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

  /**
   * Realtime sync is not supported with Neon REST API.
   */
  public enableRealtimeSync(userId: number): void {
    void userId;
    console.warn('Realtime sync is not supported with Neon.');
  }

  public async disableRealtimeSync(): Promise<void> {
    await this.neon.unsubscribeAll();
  }
}
