import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { StatusEnum, StatusEnumArray } from 'src/app/tab-list/types/statusEnum';
import { Task } from '../../tab-list/types/Task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private storage = inject(Storage);
  public _storage: Storage | null = null;
  public filter = signal<StatusEnum>(StatusEnum.All);

  public storageInitialized = new BehaviorSubject<void>(undefined);

  public tasks = signal<Task[]>([]);
  public userId = signal<number>(0);

  protected indexStatus = computed(() => {
    return StatusEnumArray.indexOf(this.filter());
  });

  constructor() {
    this.init();

    effect(() => {
      if (this.userId()) {
        this._storage?.set('userId', this.userId());
      }
    });
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    this.storageInitialized.next();
    this.filter.set(await this.getFilter());
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

  //=======================================================================================================

  public async getFilter(): Promise<StatusEnum> {
    if (!(await this._storage?.get('filter'))) {
      return StatusEnum.All;
    }

    return await this._storage?.get('filter');
  }

  public changeFilter() {
    let index = this.indexStatus();

    index += 1;
    if (index === 3) {
      index = 0;
    }

    this.filter.set(StatusEnumArray[index]);
  }

  public async saveFilter(filter: string) {
    await this._storage?.set('filter', filter);
  }
}
