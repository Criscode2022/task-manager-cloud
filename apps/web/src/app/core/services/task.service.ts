import { computed, inject, Injectable, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
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
  private readonly storageEngine = inject(Storage);
  private storageInstance: Storage | null = null;

  readonly filter = signal<StatusEnum>(StatusEnum.All);
  readonly storageReady = signal(false);
  readonly shouldShowInstall = signal(true);
  readonly tasks = signal<Task[]>([]);
  readonly userId = signal(0);

  private readonly indexStatus = computed(() =>
    StatusEnumArray.indexOf(this.filter()),
  );

  get storage(): Storage | null {
    return this.storageInstance;
  }

  constructor() {
    void this.init();
  }

  async init(): Promise<void> {
    this.storageInstance = await this.storageEngine.create();
    this.filter.set(await this.getFilter());
    this.storageReady.set(true);
  }

  async getTasks(): Promise<Task[]> {
    if (!this.storageInstance) {
      return [];
    }

    const storedTasks = ((await this.storageInstance.get('tasks')) ||
      []) as Task[];
    return storedTasks.map((task) => this.normalizeTask(task));
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    await this.storageInstance?.set(
      'tasks',
      tasks.map((task) => this.normalizeTask(task)),
    );
  }

  async getFilter(): Promise<StatusEnum> {
    const stored = await this.storageInstance?.get('filter');
    if (!stored) {
      return StatusEnum.All;
    }

    return stored;
  }

  changeFilter(): void {
    const nextIndex = (this.indexStatus() + 1) % StatusEnumArray.length;
    this.filter.set(StatusEnumArray[nextIndex]);
  }

  async saveFilter(filter: string): Promise<void> {
    await this.storageInstance?.set('filter', filter);
  }

  private normalizeTask(task: Task): Task {
    const tags = Array.isArray(task.tags)
      ? task.tags.map((tag) => tag?.trim().toLowerCase()).filter(Boolean)
      : [];

    return {
      ...task,
      priority: this.normalizePriority(task.priority),
      tags,
    };
  }

  private normalizePriority(priority?: TaskPriority): TaskPriority {
    if (priority === 'low' || priority === 'high' || priority === 'medium') {
      return priority;
    }

    return DEFAULT_TASK_PRIORITY;
  }
}
