import { computed, inject, Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import {
  StatusEnum,
  StatusEnumArray,
} from 'src/app/tabs/tab-list/types/statusEnum';
import {
  DEFAULT_TASK_PRIORITY,
  Task,
  TaskPriority,
} from '../../tabs/tab-list/types/task';

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

    const storedTasks = ((await this.storage.get('tasks')) || []) as Task[];
    return storedTasks.map((task) => this.normalizeTask(task));
  }

  public async saveTasks(tasks: Task[]): Promise<void> {
    console.log('Saving tasks to storage:', tasks);
    await this.storage?.set(
      'tasks',
      tasks.map((task) => this.normalizeTask(task)),
    );
  }

  private normalizeTask(task: Task): Task {
    const priority = this.normalizePriority(task.priority);
    const tags = Array.isArray(task.tags)
      ? task.tags.map((tag) => tag?.trim().toLowerCase()).filter(Boolean)
      : [];

    return {
      ...task,
      priority,
      tags,
    };
  }

  private normalizePriority(priority?: TaskPriority): TaskPriority {
    if (priority === 'low' || priority === 'high' || priority === 'medium') {
      return priority;
    }

    return DEFAULT_TASK_PRIORITY;
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
