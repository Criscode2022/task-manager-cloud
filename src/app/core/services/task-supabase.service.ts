import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Task, TaskDTO } from 'src/app/tabs/tab-list/types/task';
import { TaskService } from './task.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class TaskSupabaseService {
  private router = inject(Router);
  private snackbar = inject(MatSnackBar);
  private taskService = inject(TaskService);
  private supabase = inject(SupabaseService);

  private tasks = this.taskService.tasks;

  /**
   * Upload/Create a new task to Supabase
   */
  public async upload(
    task: TaskDTO,
    userId: number,
    pinHash: string
  ): Promise<void> {
    if (!userId) return;

    try {
      console.log('Uploading task to Supabase...', task, userId);

      // Verify user PIN first
      const isValidUser = await this.supabase.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      // Create the task
      const newTask = await this.supabase.createTask({
        title: task.title!,
        description: task.description || '',
        done: task.done || false,
        user_id: userId,
        updated_at: new Date(),
      });

      console.log('Task uploaded successfully:', newTask);
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
   * Edit an existing task in Supabase
   */
  public async editTask(
    task: TaskDTO,
    userId: number,
    pinHash: string
  ): Promise<void> {
    if (!userId || !task.id) return;

    try {
      console.log('Editing task in Supabase...', task, userId);

      // Verify user PIN first
      const isValidUser = await this.supabase.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      // Update the task
      const updatedTask = await this.supabase.updateTask(task.id, {
        title: task.title,
        description: task.description,
        done: task.done,
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
   * Delete a task from Supabase
   */
  public async deleteTask(
    taskId: number,
    userId: number,
    pinHash: string
  ): Promise<void> {
    if (!userId || !taskId) return;

    try {
      console.log('Deleting task from Supabase...', taskId, userId);

      // Verify user PIN first
      const isValidUser = await this.supabase.verifyUserPin(userId, pinHash);

      if (!isValidUser) {
        this.snackbar.open('Invalid user credentials', 'Close', {
          duration: 5000,
        });
        return;
      }

      // Delete the task
      await this.supabase.deleteTask(taskId);

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
      const userId = await this.supabase.createUser(pinHash);

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
   * Download all tasks for a user from Supabase (PIN-only login)
   */
  public async download(pinHash: string): Promise<void> {
    try {
      console.log('🔐 Logging in with PIN...');

      // Get user by PIN hash
      const user = await this.supabase.getUserByPinHash(pinHash);

      if (!user) {
        this.snackbar.open('Invalid PIN. Please try again.', 'Close', {
          duration: 5000,
        });
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // Get all tasks for the user
      const tasks = await this.supabase.getTasks(user.id);

      // Store PIN hash and user ID locally (session data)
      await this.taskService.storage?.set('pinHash', pinHash);
      await this.taskService.storage?.set('userId', user.id);

      // Update task service
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
      await this.supabase.deleteUser(userId);
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
   * Bulk upload local tasks to Supabase (for initial sync)
   */
  public async bulkUpload(
    tasks: Task[],
    userId: number
  ): Promise<void> {
    try {
      const tasksToUpload = tasks.map((task) => ({
        title: task.title,
        description: task.description,
        done: task.done,
        user_id: userId,
        updated_at: new Date(),
      }));

      await this.supabase.bulkUploadTasks(tasksToUpload);

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
   * Enable realtime sync for tasks
   */
  public enableRealtimeSync(userId: number): void {
    this.supabase.subscribeToTasks(userId, (payload) => {
      console.log('Realtime change detected:', payload);

      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          // Add new task to local state
          this.tasks.update((tasks) => [...tasks, newRecord as Task]);
          break;

        case 'UPDATE':
          // Update existing task in local state
          this.tasks.update((tasks) =>
            tasks.map((task) =>
              task.id === newRecord.id ? (newRecord as Task) : task
            )
          );
          break;

        case 'DELETE':
          // Remove task from local state
          this.tasks.update((tasks) =>
            tasks.filter((task) => task.id !== oldRecord.id)
          );
          break;
      }
    });
  }

  /**
   * Disable realtime sync
   */
  public async disableRealtimeSync(): Promise<void> {
    await this.supabase.unsubscribeAll();
  }
}
