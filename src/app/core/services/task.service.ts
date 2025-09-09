import { computed, inject, Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import {
  StatusEnum,
  StatusEnumArray,
} from 'src/app/tabs/tab-list/types/statusEnum';
import { Task } from '../../tabs/tab-list/types/task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private _storage = inject(Storage);
  public storage: Storage | null = null;
  public filter = signal<StatusEnum>(StatusEnum.All);

  public storageInitialized = new BehaviorSubject<void>(undefined);

  public shouldShowInstall = signal(true);
  public tasks = signal<Task[]>([]);
  public userId = signal(0);

  protected indexStatus = computed(() => {
    return StatusEnumArray.indexOf(this.filter());
  });

  constructor() {
    this.init();

    // effect(() => {
    //   if (this.userId()) {
    //     this.storage?.set('userId', this.userId());
    //   }
    // });
  }

  async init(): Promise<void> {
    this.storage = await this._storage.create();
    this.storageInitialized.next();
    this.filter.set(await this.getFilter());
  }

  public async getTasks(): Promise<Task[]> {
    if (!this.storage) {
      return [];
    }

    return (await this.storage.get('tasks')) || [];
  }

  public async saveTasks(tasks: Task[]): Promise<void> {
    const tasks_userId = tasks.map((task) => {
      return {
        ...task,
        userid: this.userId(),
      };
    });

    await this.storage?.set('tasks', tasks_userId);
  }

  //=======================================================================================================

  public async getFilter(): Promise<StatusEnum> {
    if (!(await this.storage?.get('filter'))) {
      return StatusEnum.All;
    }

    return await this.storage?.get('filter');
  }

  public changeFilter(): void {
    let index = this.indexStatus();

    index += 1;
    if (index === 3) {
      index = 0;
    }

    this.filter.set(StatusEnumArray[index]);
  }

  public async saveFilter(filter: string): Promise<void> {
    await this.storage?.set('filter', filter);
  }
}
