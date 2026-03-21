import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoadingService } from 'src/app/core/services/loading.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TaskSupabaseService } from '../../core/services/task-supabase.service';
import { TaskService } from '../../core/services/task.service';
import { TaskForm } from './task.form';
import { StatusEnum } from './types/statusEnum';
import {
  DEFAULT_TASK_PRIORITY,
  Task,
  TaskDTO,
  TaskPriority,
} from './types/task';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab-list.page.html',
  styleUrls: ['tab-list.page.scss'],
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatOptionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    TranslateModule,
  ],
})
export class TabListPage extends TaskForm {
  private readonly taskSupabaseService = inject(TaskSupabaseService);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  protected readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);

  protected canClick = signal(true);
  protected hasNewTask = signal(false);
  protected readonly loadingService = inject(LoadingService);
  protected isFormVisible = signal(false);
  protected animatingTaskIds = signal<Set<number>>(new Set());
  protected initialLoadDone = signal(false);
  protected newlyAddedTaskIds = signal<Set<number>>(new Set());
  protected selectedPriorityFilter = signal<'all' | TaskPriority>('all');
  protected selectedTagFilter = signal<string>('all');
  protected tagsAutocompleteInput = signal('');

  protected filter = this.taskService.filter;
  protected shouldShowInstall = this.taskService.shouldShowInstall;
  protected tasks = this.taskService.tasks;
  protected userId = this.taskService.userId;

  protected availableTags = computed(() => {
    const uniqueTags = new Set<string>();

    this.tasks().forEach((task) => {
      task.tags.forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
          uniqueTags.add(normalized);
        }
      });
    });

    return [...uniqueTags].sort();
  });

  protected tagSuggestions = computed(() => {
    const input = this.tagsAutocompleteInput();
    const { currentToken, selectedTags } = this.getTagInputState(input);

    return this.availableTags()
      .filter((tag) => !selectedTags.includes(tag))
      .filter((tag) => !currentToken || tag.includes(currentToken))
      .slice(0, 8);
  });

  protected hasAdvancedFilters = computed(
    () =>
      this.selectedPriorityFilter() !== 'all' ||
      this.selectedTagFilter() !== 'all',
  );

  protected filterLabelKey = computed(() => {
    switch (this.filter()) {
      case StatusEnum.All:
        return 'TASKS.FILTER.ALL';
      case StatusEnum.Done:
        return 'TASKS.FILTER.DONE';
      case StatusEnum.Undone:
        return 'TASKS.FILTER.PENDING';
    }
  });

  public filteredTasks = computed(() => {
    const animating = this.animatingTaskIds();
    const allTasks = this.tasks();
    const selectedPriority = this.selectedPriorityFilter();
    const selectedTag = this.selectedTagFilter();

    let statusFilteredTasks: Task[];

    switch (this.filter()) {
      case StatusEnum.All:
        statusFilteredTasks = allTasks;
        break;
      case StatusEnum.Done:
        statusFilteredTasks = allTasks.filter(
          (task) => task.done || animating.has(task.id),
        );
        break;
      case StatusEnum.Undone:
        statusFilteredTasks = allTasks.filter(
          (task) => !task.done || animating.has(task.id),
        );
        break;
    }

    return this.sortTasksByPriority(
      statusFilteredTasks.filter(
        (task) =>
          (selectedPriority === 'all' || task.priority === selectedPriority) &&
          (selectedTag === 'all' || task.tags.includes(selectedTag)),
      ),
    );
  });

  protected alternativeFilterInfo = computed(() => {
    const currentFilter = this.filter();
    const allTasks = this.tasks();
    const hasFilteredTasks = this.filteredTasks().length > 0;
    const hasTasks = allTasks.length > 0;

    // Do not show done/pending suggestion when extra filters are active.
    if (hasFilteredTasks || !hasTasks || this.hasAdvancedFilters()) {
      return null;
    }

    // Calculate tasks in other filters
    const doneTasks = allTasks.filter((task) => task.done).length;
    const undoneTasks = allTasks.filter((task) => !task.done).length;

    // Determine which filter has tasks and suggest it
    if (currentFilter === StatusEnum.Done && undoneTasks > 0) {
      return {
        count: undoneTasks,
        filter: StatusEnum.Undone,
        labelKey:
          undoneTasks === 1
            ? 'TASKS.PENDING_TASK_SINGULAR'
            : 'TASKS.PENDING_TASK_PLURAL',
      };
    } else if (currentFilter === StatusEnum.Undone && doneTasks > 0) {
      return {
        count: doneTasks,
        filter: StatusEnum.Done,
        labelKey:
          doneTasks === 1
            ? 'TASKS.COMPLETED_TASK_SINGULAR'
            : 'TASKS.COMPLETED_TASK_PLURAL',
      };
    } else if (currentFilter === StatusEnum.All) {
      // This shouldn't happen since All shows all tasks
      return null;
    }

    return null;
  });

  protected switchToAlternativeFilter(): void {
    const info = this.alternativeFilterInfo();
    if (info) {
      this.taskService.filter.set(info.filter);
    }
  }

  protected get installButtons() {
    return [
      {
        text: this.translate.instant('COMMON.OK'),
        role: 'cancel',
      },
      {
        text: this.translate.instant('TASKS.DONT_SHOW_AGAIN'),
        role: 'confirm',
        handler: () => {
          this.shouldShowInstall.set(false);
          localStorage.setItem('install', 'false');
        },
      },
    ];
  }

  constructor() {
    super();

    afterNextRender(() => {
      // Mark initial load as done after the first render cycle completes
      // This prevents the staggered scale-in animation from replaying on every list change
      setTimeout(() => this.initialLoadDone.set(true), 600);
    });

    effect(async () => {
      await this.taskService.saveTasks(this.tasks());
    });

    effect(() => {
      this.taskService.saveFilter(this.filter());
    });

    effect(() => {
      if (this.tasks().length === 0 && this.isTabletOrDesktop()) {
        this.isFormVisible.set(true);
      }
    });

    effect(() => {
      const selectedTag = this.selectedTagFilter();
      if (
        selectedTag !== 'all' &&
        !this.availableTags().includes(selectedTag)
      ) {
        this.selectedTagFilter.set('all');
      }
    });
  }

  protected async presentEditAlert(task: Task): Promise<void> {
    type EditTaskAlertData = {
      title?: string;
      description?: string;
      priority?: string;
      tags?: string;
      id: number | string;
    };

    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.EDIT_TASK'),
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: this.translate.instant('TASKS.TITLE_PLACEHOLDER'),
          value: task.title,
        },
        {
          name: 'description',
          type: 'text',
          placeholder: this.translate.instant(
            'TASKS.DESCRIPTION_PLACEHOLDER_EDIT',
          ),
          value: task.description,
        },
        {
          name: 'priority',
          type: 'text',
          placeholder: this.translate.instant(
            'TASKS.PRIORITY_PLACEHOLDER_EDIT',
          ),
          value: task.priority,
        },
        {
          name: 'tags',
          type: 'text',
          placeholder: this.translate.instant('TASKS.TAGS_PLACEHOLDER_EDIT'),
          value: task.tags.join(', '),
        },
        {
          name: 'id',
          value: task.id,
          attributes: {
            type: 'hidden',
          },
        },
      ],
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('COMMON.CONFIRM'),
          role: 'confirm',
          handler: (data: EditTaskAlertData) => {
            const id = Number(data.id);
            const updatedTitle = data.title?.trim() || task.title;
            const updatedDescription = data.description?.trim() || '';
            const updatedPriority = this.normalizePriority(data.priority);
            const updatedTags = this.parseTags(data.tags);
            this.editTask(
              id,
              updatedTitle,
              updatedDescription,
              updatedPriority,
              updatedTags,
            );
          },
        },
      ],
    });

    await alert.present();
  }

  protected refresh(): void {
    this.userService.getUser();
  }

  protected async addTask(): Promise<void> {
    if (!(this.form.valid && this.title?.value)) {
      console.error('Invalid form, please check the inputs');
      return;
    }

    const id = Date.now();

    const task: TaskDTO = {
      id,
      title: this.title?.value ?? '',
      description: this.description?.value || '',
      done: false,
      priority: this.normalizePriority(this.priority?.value),
      tags: this.parseTags(this.tagsInput?.value),
    };

    // Track the new task ID for a gentler entrance animation
    this.newlyAddedTaskIds.update((ids) => {
      const newSet = new Set(ids);
      newSet.add(id);
      return newSet;
    });

    this.tasks.update((tasks) => [...tasks, task as Task]);

    this.form.reset({
      title: '',
      description: '',
      priority: DEFAULT_TASK_PRIORITY,
      tagsInput: '',
    });
    this.tagsAutocompleteInput.set('');

    // Remove from newly added set after animation completes
    setTimeout(() => {
      this.newlyAddedTaskIds.update((ids) => {
        const newSet = new Set(ids);
        newSet.delete(id);
        return newSet;
      });
    }, 500);

    const userId = this.taskService.userId();

    if (!userId) {
      this.hasNewTask.set(true);
      setTimeout(() => {
        this.hasNewTask.set(false);
      }, 1000);
      return;
    }

    task.user_id = userId;

    const pinHash = this.userService.pinHash();
    if (!pinHash) {
      console.error('No PIN hash found');
      return;
    }

    console.log('task,', task);

    this.taskSupabaseService.upload(task, userId, pinHash);

    this.hasNewTask.set(true);
    setTimeout(() => {
      this.hasNewTask.set(false);
    }, 1000);
  }

  protected toggleTaskState(taskId: number): void {
    if (!this.canClick()) {
      return;
    }

    console.log('Toggling task state for taskId:', taskId);

    // Disable clicks during animation
    this.canClick.set(false);

    // Add task to animating set to keep it visible during animation
    this.animatingTaskIds.update((ids) => {
      const newSet = new Set(ids);
      newSet.add(taskId);
      return newSet;
    });

    // First, apply visual feedback immediately (for animation)
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    );

    // After half a second, persist changes and remove from animating
    setTimeout(() => {
      this.canClick.set(true);

      // Remove from animating set
      this.animatingTaskIds.update((ids) => {
        const newSet = new Set(ids);
        newSet.delete(taskId);
        return newSet;
      });

      const userId = this.taskService.userId();
      if (userId) {
        const task = this.tasks().find((t) => t.id === taskId);
        if (!task) return;

        const pinHash = this.userService.pinHash();
        if (!pinHash) {
          console.error('No PIN hash found');
          return;
        }

        // Update task in Supabase
        this.taskSupabaseService.editTask(
          {
            id: taskId,
            title: task.title,
            description: task.description,
            done: task.done,
            priority: task.priority,
            tags: task.tags,
          },
          userId,
          pinHash,
        );
      }
    }, 500);
  }

  protected editTask(
    id: number,
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
  ): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, title, description, priority, tags } : task,
      ),
    );

    if (this.userId()) {
      const task: TaskDTO = {
        id,
        title,
        description,
        priority,
        tags,
      };

      const pinHash = this.userService.pinHash();
      if (!pinHash) {
        console.error('No PIN hash found');
        return;
      }

      this.taskSupabaseService.editTask(task, this.userId(), pinHash);
    }
  }

  protected deleteTask(taskId: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));

    if (this.userId()) {
      const pinHash = this.userService.pinHash();
      if (!pinHash) {
        console.error('No PIN hash found');
        return;
      }

      this.taskSupabaseService.deleteTask(taskId, this.userId(), pinHash);
    }
  }

  protected isTabletOrDesktop(): boolean {
    return window.matchMedia('(min-width: 768px)').matches;
  }

  protected getPriorityTranslationKey(priority: TaskPriority): string {
    switch (priority) {
      case 'high':
        return 'TASKS.PRIORITY.HIGH';
      case 'low':
        return 'TASKS.PRIORITY.LOW';
      default:
        return 'TASKS.PRIORITY.MEDIUM';
    }
  }

  protected getPriorityClass(priority: TaskPriority): string {
    return `priority-${priority}`;
  }

  protected onPriorityFilterChange(value: unknown): void {
    this.selectedPriorityFilter.set(
      value === 'high' || value === 'medium' || value === 'low' ? value : 'all',
    );
  }

  protected onTagFilterChange(value: unknown): void {
    if (typeof value !== 'string') {
      this.selectedTagFilter.set('all');
      return;
    }

    this.selectedTagFilter.set(value || 'all');
  }

  protected clearAdvancedFilters(): void {
    this.selectedPriorityFilter.set('all');
    this.selectedTagFilter.set('all');
  }

  protected onTagsInputChange(value: string): void {
    this.tagsAutocompleteInput.set(value || '');
  }

  protected applyTagSuggestion(tag: string): void {
    const currentValue = this.tagsInput?.value;
    const rawInput = typeof currentValue === 'string' ? currentValue : '';
    const splitInput = rawInput.split(',');
    const committedTags = splitInput
      .slice(0, -1)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const nextTags = [...new Set([...committedTags, tag])];
    const nextValue = `${nextTags.join(', ')}, `;
    this.tagsInput?.setValue(nextValue);
    this.tagsAutocompleteInput.set(nextValue);
  }

  protected clearTagsInput(): void {
    this.clear('tagsInput');
    this.tagsAutocompleteInput.set('');
  }

  private sortTasksByPriority(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const priorityDiff =
        this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return b.id - a.id;
    });
  }

  private getPriorityWeight(priority: TaskPriority): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
    }
  }

  private normalizePriority(priority: unknown): TaskPriority {
    if (priority === 'high' || priority === 'low' || priority === 'medium') {
      return priority;
    }

    if (typeof priority === 'string') {
      const normalizedPriority = priority.trim().toLowerCase();

      if (normalizedPriority === 'alta') {
        return 'high';
      }

      if (normalizedPriority === 'media') {
        return 'medium';
      }

      if (normalizedPriority === 'baja') {
        return 'low';
      }

      if (
        normalizedPriority === 'high' ||
        normalizedPriority === 'medium' ||
        normalizedPriority === 'low'
      ) {
        return normalizedPriority;
      }
    }

    return DEFAULT_TASK_PRIORITY;
  }

  private parseTags(input: unknown): string[] {
    if (typeof input !== 'string') {
      return [];
    }

    return [
      ...new Set(
        input
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 6),
      ),
    ];
  }

  private getTagInputState(input: string): {
    currentToken: string;
    selectedTags: string[];
  } {
    const chunks = input.split(',');
    const currentToken = (chunks[chunks.length - 1] || '').trim().toLowerCase();
    const selectedTags = chunks
      .slice(0, -1)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    return { currentToken, selectedTags };
  }
}
