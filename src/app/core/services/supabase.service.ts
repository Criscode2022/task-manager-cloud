import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Task } from '../../tabs/tab-list/types/task';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  // ===========================
  // TASK OPERATIONS
  // ===========================

  /**
   * Get all tasks for a specific user
   */
  async getTasks(userId: number): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Delete all tasks for a user
   */
  async deleteAllTasks(userId: number): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all tasks:', error);
      throw error;
    }
  }

  /**
   * Bulk upload tasks
   */
  async bulkUploadTasks(tasks: Omit<Task, 'id' | 'created_at'>[]): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (error) {
      console.error('Error bulk uploading tasks:', error);
      throw error;
    }

    return data || [];
  }

  // ===========================
  // USER OPERATIONS
  // ===========================

  /**
   * Create a new user with encryption data
   */
  async createUser(encryptedPin: string, iv: string, authTag: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        encrypted_pin: encryptedPin,
        iv: iv,
        auth_tag: authTag,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: number) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  }

  /**
   * Verify user credentials
   */
  async verifyUser(
    userId: number,
    iv: string,
    authTag: string,
    encryptedPin: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('iv', iv)
      .eq('auth_tag', authTag)
      .eq('encrypted_pin', encryptedPin)
      .single();

    if (error) {
      console.error('Error verifying user:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Delete user and all associated tasks
   */
  async deleteUser(userId: number): Promise<void> {
    // First delete all tasks
    await this.deleteAllTasks(userId);

    // Then delete the user
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ===========================
  // REALTIME SUBSCRIPTIONS
  // ===========================

  /**
   * Subscribe to task changes for a specific user
   */
  subscribeToTasks(userId: number, callback: (payload: any) => void) {
    return this.supabase
      .channel(`tasks-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll() {
    await this.supabase.removeAllChannels();
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  /**
   * Get Supabase client instance (for advanced use cases)
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }
}
