import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../../shared/types/Task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private _storage: Storage | null = null;
  public storageInitialized = new BehaviorSubject<void>(undefined);

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    this.storageInitialized.next();
  }

  public async removeTask(taskId: number) {
    const tasks = await this.getTasks();
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    await this.saveTasks(updatedTasks);
  }

  public async getTasks(): Promise<Task[]> {
    if (!this._storage) {
      return [];
    }
    return (await this._storage.get('tasks')) || [];
  }

  public async saveTasks(tasks: Task[]) {
    await this._storage?.set('tasks', tasks);
  }

  public async clearTasks() {
    await this._storage?.clear();
  }
}
