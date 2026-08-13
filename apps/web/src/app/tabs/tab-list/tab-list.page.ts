import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { firstValueFrom } from 'rxjs';
import { FormField } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoadingService } from 'src/app/core/services/loading.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TaskNeonService } from '../../core/services/task-neon.service';
import { TaskService } from '../../core/services/task.service';
import {
  EditTaskDialogComponent,
  EditTaskDialogResult,
} from './edit-task-dialog/edit-task-dialog.component';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonicModule,
    CommonModule,
    FormField,
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
  private readonly taskNeonService = inject(TaskNeonService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  protected readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressTaskToggle = false;
  private initialFormDecided = false;

  protected canClick = signal(true);
  protected hasNewTask = signal(false);
  protected readonly loadingService = inject(LoadingService);
  protected isFormVisible = signal(false);
  protected animatingTaskIds = signal<Set<number>>(new Set());
  protected initialLoadDone = signal(false);
  protected newlyAddedTaskIds = signal<Set<number>>(new Set());
  protected selectedPriorityFilter = signal<'all' | TaskPriority>('all');
  protected selectedTagFilter = signal<string>('all');
  protected searchQuery = signal('');
  protected isSearchOpen = signal(false);
  protected tagsAutocompleteInput = signal('');
  private readonly mobileSearchInput =
    viewChild<ElementRef<HTMLInputElement>>('mobileSearchInput');

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

    return [...uniqueTags].sort((a, b) => a.localeCompare(b));
  });

  protected tagSuggestions = computed(() => {
    const input = this.tagsAutocompleteInput();
    const { currentToken, selectedTags } = this.getTagInputState(input);

    return this.availableTags()
      .filter((tag) => !selectedTags.includes(tag))
      .filter((tag) => !currentToken || tag.includes(currentToken))
      .slice(0, 8);
  });

  protected hasSearchQuery = computed(
    () => this.normalizedSearchQuery().length > 0,
  );

  protected hasAdvancedFilters = computed(
    () =>
      this.selectedPriorityFilter() !== 'all' ||
      this.selectedTagFilter() !== 'all' ||
      this.hasSearchQuery(),
  );

  private normalizedSearchQuery = computed(() =>
    this.searchQuery().trim().toLowerCase(),
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

  protected readonly filteredTasks = computed(() => {
    const selectedPriority = this.selectedPriorityFilter();
    const selectedTag = this.selectedTagFilter();
    const query = this.normalizedSearchQuery();

    return this.sortTasksByPriority(
      this.filterTasksByStatus().filter((task) => {
        if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
          return false;
        }

        if (selectedTag !== 'all' && !task.tags.includes(selectedTag)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return this.taskMatchesSearch(task, query);
      }),
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
    if (!info) {
      return;
    }

    this.taskService.filter.set(info.filter);
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
      if (!this.taskService.storageReady() || !this.taskService.tasksHydrated()) {
        return;
      }
      if (this.initialFormDecided) {
        return;
      }

      this.initialFormDecided = true;
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
    const dialogRef = this.dialog.open<
      EditTaskDialogComponent,
      Task,
      EditTaskDialogResult | undefined
    >(EditTaskDialogComponent, {
      data: task,
      autoFocus: 'input',
      panelClass: 'edit-task-dialog-panel',
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      return;
    }

    this.editTask(
      task.id,
      result.title || task.title,
      result.description || '',
      this.normalizePriority(result.priority),
      this.parseTags(result.tags),
    );
  }

  protected refresh(): void {
    this.userService.getUser();
  }

  protected onTaskContentClick(task: Task): void {
    if (this.suppressTaskToggle) {
      this.suppressTaskToggle = false;
      return;
    }

    if (!this.canClick()) {
      return;
    }

    this.clearClickTimer();
    this.clickTimer = setTimeout(() => {
      this.clickTimer = null;
      this.toggleTaskState(task.id);
    }, 280);
  }

  protected onTaskDoubleClick(task: Task, event: Event): void {
    event.preventDefault();
    if (this.isTabletOrDesktop()) {
      return;
    }

    this.clearClickTimer();
    this.clearTaskPress();
    this.suppressTaskToggle = true;
    void this.presentFullTaskText(task);
  }

  protected openCreateForm(): void {
    this.isFormVisible.set(true);
  }

  protected async requestCloseCreateForm(): Promise<void> {
    if (!this.hasUnsavedCreateChanges()) {
      this.closeCreateForm();
      return;
    }

    const alert = await this.alertController.create({
      header: this.translate.instant('TASKS.UNSAVED_CHANGES_TITLE'),
      message: this.translate.instant('TASKS.UNSAVED_CHANGES_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('TASKS.KEEP_EDITING'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('TASKS.DISCARD_CHANGES'),
          role: 'confirm',
          handler: () => {
            this.closeCreateForm();
          },
        },
      ],
    });
    await alert.present();
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    if (this.isFormVisible()) {
      void this.requestCloseCreateForm();
      return;
    }

    if (this.isSearchOpen()) {
      this.closeSearch();
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value ?? '');
  }

  protected openSearch(): void {
    this.isSearchOpen.set(true);
    setTimeout(() => this.mobileSearchInput()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.isSearchOpen.set(false);
  }

  protected clearSearch(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.searchQuery.set('');
  }

  private taskMatchesSearch(task: Task, query: string): boolean {
    if (task.title.toLowerCase().includes(query)) {
      return true;
    }

    if (task.description.toLowerCase().includes(query)) {
      return true;
    }

    return task.tags.some((tag) => tag.toLowerCase().includes(query));
  }

  protected onTaskPressStart(task: Task, event: PointerEvent): void {
    this.clearTaskPress();
    const root = event.currentTarget;
    if (!(root instanceof HTMLElement)) {
      return;
    }

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      if (!this.isTaskTextClipped(root)) {
        return;
      }

      this.clearClickTimer();
      this.suppressTaskToggle = true;

      if (this.isTabletOrDesktop()) {
        void this.copyTaskText(task);
        return;
      }

      void this.presentFullTaskText(task);
    }, 450);
  }

  protected onTaskPressEnd(): void {
    this.clearTaskPress();
  }

  protected onTaskContextMenu(event: Event): void {
    event.preventDefault();
  }

  protected async addTask(event?: Event): Promise<void> {
    event?.preventDefault();

    const model = this.taskModel();
    if (this.form().invalid() || !model.title.trim()) {
      console.error('Invalid form, please check the inputs');
      return;
    }

    const id = Date.now();

    const task: TaskDTO = {
      id,
      title: model.title.trim(),
      description: model.description.trim(),
      done: false,
      priority: this.normalizePriority(model.priority),
      tags: this.parseTags(model.tagsInput),
    };

    // Track the new task ID for a gentler entrance animation
    this.newlyAddedTaskIds.update((ids) => {
      const newSet = new Set(ids);
      newSet.add(id);
      return newSet;
    });

    this.tasks.update((tasks) => [...tasks, task as Task]);

    this.resetTaskForm();
    this.tagsAutocompleteInput.set('');
    this.closeCreateForm();

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

    const token = this.userService.accessToken();
    if (!token) {
      console.error('No access token found');
      return;
    }

    console.log('task,', task);

    this.taskNeonService.upload(task, userId, token);

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

        const token = this.userService.accessToken();
        if (!token) {
          console.error('No access token found');
          return;
        }

        // Update task in Neon
        this.taskNeonService.editTask(
          {
            id: taskId,
            title: task.title,
            description: task.description,
            done: task.done,
            priority: task.priority,
            tags: task.tags,
          },
          userId,
          token,
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

      const token = this.userService.accessToken();
      if (!token) {
        console.error('No access token found');
        return;
      }

      this.taskNeonService.editTask(task, this.userId(), token);
    }
  }

  protected deleteTask(taskId: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));

    if (this.userId()) {
      const token = this.userService.accessToken();
      if (!token) {
        console.error('No access token found');
        return;
      }

      this.taskNeonService.deleteTask(taskId, this.userId(), token);
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
    return `task-priority-${priority}`;
  }

  /** Explicit selected text so ion-select shows the value without an extra click. */
  protected getPrioritySelectLabelKey(priority: unknown): string {
    return this.getPriorityTranslationKey(this.normalizePriority(priority));
  }

  protected getPriorityFilterLabelKey(): string {
    const value = this.selectedPriorityFilter();
    return value === 'all'
      ? 'TASKS.ALL_PRIORITIES'
      : this.getPriorityTranslationKey(value);
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
    this.searchQuery.set('');
  }

  protected onTagsInputChange(value: string): void {
    this.tagsAutocompleteInput.set(value || '');
  }

  protected onCreatePriorityChange(value: unknown): void {
    this.taskModel.update((model) => ({
      ...model,
      priority: this.normalizePriority(value),
    }));
  }

  protected applyTagSuggestion(tag: string): void {
    const rawInput = this.taskModel().tagsInput;
    const splitInput = rawInput.split(',');
    const committedTags = splitInput
      .slice(0, -1)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const nextTags = [...new Set([...committedTags, tag])];
    const nextValue = `${nextTags.join(', ')}, `;
    this.taskModel.update((model) => ({ ...model, tagsInput: nextValue }));
    this.tagsAutocompleteInput.set(nextValue);
  }

  protected clearTagsInput(): void {
    this.clear('tagsInput');
    this.tagsAutocompleteInput.set('');
  }

  private filterTasksByStatus(): Task[] {
    const allTasks = this.tasks();
    const animating = this.animatingTaskIds();

    switch (this.filter()) {
      case StatusEnum.Done:
        return allTasks.filter((task) => task.done || animating.has(task.id));
      case StatusEnum.Undone:
        return allTasks.filter((task) => !task.done || animating.has(task.id));
      default:
        return allTasks;
    }
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

  private closeCreateForm(): void {
    this.isFormVisible.set(false);
    this.resetTaskForm();
    this.tagsAutocompleteInput.set('');
  }

  private clearClickTimer(): void {
    if (!this.clickTimer) {
      return;
    }

    clearTimeout(this.clickTimer);
    this.clickTimer = null;
  }

  private clearTaskPress(): void {
    if (!this.longPressTimer) {
      return;
    }

    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private isTaskTextClipped(root: HTMLElement): boolean {
    return [...root.querySelectorAll<HTMLElement>('.task-title, .task-description')].some(
      (node) => node.scrollWidth > node.clientWidth + 1,
    );
  }

  private async presentFullTaskText(task: Task): Promise<void> {
    const alert = await this.alertController.create({
      header: task.title,
      message: task.description || undefined,
      buttons: [this.translate.instant('COMMON.OK')],
    });
    await alert.present();
  }

  private getTaskClipboardText(task: Task): string {
    const title = task.title?.trim() ?? '';
    const description = task.description?.trim() ?? '';
    return [title, description].filter(Boolean).join('\n');
  }

  private async copyTaskText(task: Task): Promise<void> {
    const text = this.getTaskClipboardText(task);
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.snackbar.open(
        this.translate.instant('TASKS.COPIED_TO_CLIPBOARD'),
        '',
        { duration: 2200 },
      );
    } catch (error) {
      console.error('Failed to copy task text:', error);
    }
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
