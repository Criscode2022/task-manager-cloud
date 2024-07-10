import { Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { StatusEnum } from 'src/app/tab-list/types/statusEnum';
import { Task } from '../../shared/types/Task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private _storage: Storage | null = null;
  public storageInitialized = new BehaviorSubject<void>(undefined);

  public tasks = signal<Task[]>([]);

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    this.storageInitialized.next();
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

  public async getFilter(): Promise<StatusEnum> {
    if (!this._storage) {
      return StatusEnum.All;
    }
    return (await this._storage.get('filter')) || StatusEnum.All;
  }

  public async saveFilter(filter: string) {
    await this._storage?.set('filter', filter);
  }
}
