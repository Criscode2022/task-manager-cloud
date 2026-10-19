import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LoadingService } from 'src/app/core/services/loading.service';
import { UserService } from 'src/app/core/services/user-service/user.service';
import {
  SegmentedControlComponent,
  SegmentOption,
} from '../../core/components/segmented-control/segmented-control.component';
import { TaskNeonService } from '../../core/services/task-neon.service';
import { TaskService } from '../../core/services/task.service';
import { TaskComposerComponent } from './task-composer/task-composer.component';
import { TaskEditorComponent } from './task-editor/task-editor.component';
import { StatusEnum } from './types/statusEnum';
import {
  compareByPriority,
  PRIORITY_LABEL_KEYS,
  Task,
  TASK_PRIORITIES,
  TaskDraft,
  TaskDTO,
  TaskPriority,
} from './types/task';

/** How long a crossed-off task stays in place before it moves to its new group. */
const SETTLE_DELAY_MS = 650;
const NEW_TASK_HIGHLIGHT_MS = 1400;
const LONG_PRESS_MS = 450;
const UNDO_WINDOW_MS = 5000;
const WIDE_LAYOUT_QUERY = '(min-width: 768px)';

const withId = (ids: ReadonlySet<number>, id: number): ReadonlySet<number> =>
  new Set(ids).add(id);

const withoutId = (ids: ReadonlySet<number>, id: number): ReadonlySet<number> => {
  const next = new Set(ids);
  next.delete(id);
  return next;
};

type CloudSession = { userId: number; token: string };

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab-list.page.html',
  styleUrls: ['tab-list.page.scss'],
  imports: [
    IonicModule,
    NgTemplateOutlet,
    TranslateModule,
    SegmentedControlComponent,
    TaskComposerComponent,
    TaskEditorComponent,
  ],
})
export class TabListPage {
  private readonly taskNeonService = inject(TaskNeonService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly wideLayout = window.matchMedia(WIDE_LAYOUT_QUERY);
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressNextOpen = false;

  protected readonly loadingService = inject(LoadingService);
  protected readonly filter = this.taskService.filter;
  protected readonly shouldShowInstall = this.taskService.shouldShowInstall;
  protected readonly tasks = this.taskService.tasks;
  protected readonly userId = this.taskService.userId;

  protected readonly priorityChoices = TASK_PRIORITIES;
  protected readonly isWide = signal(this.wideLayout.matches);

  /** Tasks whose done state just changed; they stay where they were while the stroke draws. */
  protected readonly settlingTaskIds = signal<ReadonlySet<number>>(new Set());
  protected readonly newlyAddedTaskIds = signal<ReadonlySet<number>>(new Set());
  protected readonly editingTaskId = signal<number | null>(null);
  protected readonly selectedPriorityFilter = signal<'all' | TaskPriority>('all');
  protected readonly selectedTagFilter = signal<string>('all');
  protected readonly searchQuery = signal('');
  protected readonly isSearchOpen = signal(false);
  protected readonly isDoneExpanded = signal(true);

  protected readonly availableTags = computed(() => {
    const uniqueTags = new Set(
      this.tasks().flatMap((task) =>
        task.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    );
    return [...uniqueTags].sort((a, b) => a.localeCompare(b));
  });

  private readonly normalizedSearchQuery = computed(() =>
    this.searchQuery().trim().toLowerCase(),
  );

  protected readonly hasSearchQuery = computed(() => this.normalizedSearchQuery().length > 0);

  protected readonly hasNarrowFilters = computed(
    () => this.selectedPriorityFilter() !== 'all' || this.selectedTagFilter() !== 'all',
  );

  protected readonly hasAdvancedFilters = computed(
    () => this.hasNarrowFilters() || this.hasSearchQuery(),
  );

  /** Tasks that match the priority, tag, and search, before the status view applies. */
  private readonly narrowedTasks = computed(() => {
    const priority = this.selectedPriorityFilter();
    const tag = this.selectedTagFilter();
    const query = this.normalizedSearchQuery();

    return this.tasks().filter(
      (task) =>
        (priority === 'all' || task.priority === priority) &&
        (tag === 'all' || task.tags.includes(tag)) &&
        (!query || this.taskMatchesSearch(task, query)),
    );
  });

  protected readonly statusCounts = computed(() => {
    const tasks = this.narrowedTasks();
    const done = tasks.filter((task) => task.done).length;
    return { all: tasks.length, pending: tasks.length - done, done };
  });

  protected readonly statusOptions = computed<SegmentOption<StatusEnum>[]>(() => {
    const counts = this.statusCounts();
    return [
      { value: StatusEnum.All, labelKey: 'TASKS.FILTER.ALL', count: counts.all },
      { value: StatusEnum.Undone, labelKey: 'TASKS.FILTER.PENDING', count: counts.pending },
      { value: StatusEnum.Done, labelKey: 'TASKS.FILTER.DONE', count: counts.done },
    ];
  });

  /** The line under the page name: what is left across the whole list. */
  protected readonly summary = computed(() => {
    const tasks = this.tasks();
    if (!tasks.length) {
      return null;
    }

    const done = tasks.filter((task) => task.done).length;
    const open = tasks.length - done;
    return open
      ? { key: 'TASKS.SUMMARY', params: { open, done } }
      : { key: 'TASKS.SUMMARY_ALL_DONE', params: { done } };
  });

  protected readonly filteredTasks = computed(() => {
    const status = this.filter();
    return this.narrowedTasks()
      .filter(
        (task) => status === StatusEnum.All || (status === StatusEnum.Done) === this.isShownAsDone(task),
      )
      .sort(compareByPriority);
  });

  protected readonly openTasks = computed(() =>
    this.filteredTasks().filter((task) => !this.isShownAsDone(task)),
  );

  protected readonly doneTasks = computed(() =>
    this.filteredTasks().filter((task) => this.isShownAsDone(task)),
  );

  protected readonly showDoneHeading = computed(
    () =>
      this.filter() === StatusEnum.All &&
      this.openTasks().length > 0 &&
      this.doneTasks().length > 0,
  );

  protected readonly alternativeFilterInfo = computed(() => {
    if (this.filteredTasks().length || !this.tasks().length || this.hasAdvancedFilters()) {
      return null;
    }

    const { pending, done } = this.statusCounts();
    if (this.filter() === StatusEnum.Done && pending > 0) {
      return {
        count: pending,
        filter: StatusEnum.Undone,
        labelKey: pending === 1 ? 'TASKS.PENDING_TASK_SINGULAR' : 'TASKS.PENDING_TASK_PLURAL',
      };
    }

    if (this.filter() === StatusEnum.Undone && done > 0) {
      return {
        count: done,
        filter: StatusEnum.Done,
        labelKey: done === 1 ? 'TASKS.COMPLETED_TASK_SINGULAR' : 'TASKS.COMPLETED_TASK_PLURAL',
      };
    }

    return null;
  });

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
    effect(async () => {
      await this.taskService.saveTasks(this.tasks());
    });

    effect(() => {
      this.taskService.saveFilter(this.filter());
    });

    effect(() => {
      const selectedTag = this.selectedTagFilter();
      if (selectedTag !== 'all' && !this.availableTags().includes(selectedTag)) {
        this.selectedTagFilter.set('all');
      }
    });

    const onLayoutChange = (event: MediaQueryListEvent) => this.isWide.set(event.matches);
    this.wideLayout.addEventListener('change', onLayoutChange);
    inject(DestroyRef).onDestroy(() =>
      this.wideLayout.removeEventListener('change', onLayoutChange),
    );
  }

  protected priorityLabelKey(priority: TaskPriority): string {
    return PRIORITY_LABEL_KEYS[priority];
  }

  protected refresh(): void {
    this.userService.getUser();
  }

  protected switchToAlternativeFilter(): void {
    const info = this.alternativeFilterInfo();
    if (info) {
      this.filter.set(info.filter);
    }
  }

  protected toggleDoneGroup(): void {
    this.isDoneExpanded.update((expanded) => !expanded);
  }

  // Search

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value ?? '');
  }

  protected openSearch(): void {
    this.isSearchOpen.set(true);
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput()?.nativeElement.focus();
  }

  // Narrowing

  protected togglePriorityFilter(priority: TaskPriority): void {
    this.selectedPriorityFilter.update((current) => (current === priority ? 'all' : priority));
  }

  protected toggleTagFilter(tag: string): void {
    this.selectedTagFilter.update((current) => (current === tag ? 'all' : tag));
  }

  protected clearAdvancedFilters(): void {
    this.selectedPriorityFilter.set('all');
    this.selectedTagFilter.set('all');
    this.searchQuery.set('');
  }

  // Creating

  protected addTask(draft: TaskDraft): void {
    const id = Date.now();
    const task: TaskDTO = { ...draft, id, done: false };

    this.tasks.update((tasks) => [...tasks, task as Task]);
    this.highlightNewTask(id);
    this.revealTask(id);

    const session = this.cloudSession();
    if (session) {
      void this.taskNeonService.upload({ ...task, user_id: session.userId }, session.userId, session.token);
    }
  }

  // Completing

  protected toggleTaskState(taskId: number): void {
    if (this.settlingTaskIds().has(taskId)) {
      return;
    }

    this.settlingTaskIds.update((ids) => withId(ids, taskId));
    this.tasks.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    );
    setTimeout(
      () => this.settlingTaskIds.update((ids) => withoutId(ids, taskId)),
      SETTLE_DELAY_MS,
    );

    const task = this.tasks().find((item) => item.id === taskId);
    if (task) {
      this.syncTaskToCloud(task);
    }
  }

  // Editing

  protected openEditor(task: Task): void {
    if (this.suppressNextOpen) {
      this.suppressNextOpen = false;
      return;
    }

    this.editingTaskId.set(task.id);
  }

  protected closeEditor(taskId: number): void {
    this.editingTaskId.set(null);
    setTimeout(() => document.getElementById(`task-body-${taskId}`)?.focus());
  }

  protected saveEdit(taskId: number, draft: TaskDraft): void {
    this.tasks.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, ...draft } : task)),
    );
    this.closeEditor(taskId);

    const task = this.tasks().find((item) => item.id === taskId);
    if (task) {
      this.syncTaskToCloud(task);
    }
  }

  // Deleting

  protected deleteTask(taskId: number): void {
    const task = this.tasks().find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    if (this.editingTaskId() === taskId) {
      this.editingTaskId.set(null);
    }
    this.tasks.update((tasks) => tasks.filter((item) => item.id !== taskId));

    const session = this.cloudSession();
    const cloudDeletion = session
      ? this.taskNeonService.deleteTask(taskId, session.userId, session.token)
      : Promise.resolve();
    this.offerUndo(task, cloudDeletion);
  }

  // Long press copies the task's text.

  protected onTaskPressStart(task: Task): void {
    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.suppressNextOpen = true;
      void this.copyTaskText(task);
    }, LONG_PRESS_MS);
  }

  protected onTaskPressEnd(): void {
    this.clearLongPress();
  }

  private isShownAsDone(task: Task): boolean {
    return this.settlingTaskIds().has(task.id) ? !task.done : task.done;
  }

  private taskMatchesSearch(task: Task, query: string): boolean {
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  private highlightNewTask(taskId: number): void {
    this.newlyAddedTaskIds.update((ids) => withId(ids, taskId));
    setTimeout(
      () => this.newlyAddedTaskIds.update((ids) => withoutId(ids, taskId)),
      NEW_TASK_HIGHLIGHT_MS,
    );
  }

  private revealTask(taskId: number): void {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    setTimeout(() =>
      document.getElementById(`task-${taskId}`)?.scrollIntoView({ block: 'nearest', behavior }),
    );
  }

  private offerUndo(task: Task, cloudDeletion: Promise<void>): void {
    this.snackbar
      .open(
        this.translate.instant('TASKS.TASK_DELETED'),
        this.translate.instant('TASKS.UNDO'),
        { duration: UNDO_WINDOW_MS },
      )
      .onAction()
      .subscribe(() => void this.restoreTask(task, cloudDeletion));
  }

  private async restoreTask(task: Task, cloudDeletion: Promise<void>): Promise<void> {
    this.tasks.update((tasks) => [...tasks, task]);

    const session = this.cloudSession();
    if (!session) {
      return;
    }

    await cloudDeletion.catch(() => undefined);
    await this.taskNeonService.upload({ ...task, user_id: session.userId }, session.userId, session.token);
  }

  private syncTaskToCloud(task: Task): void {
    const session = this.cloudSession();
    if (!session) {
      return;
    }

    void this.taskNeonService.editTask(
      {
        id: task.id,
        title: task.title,
        description: task.description,
        done: task.done,
        priority: task.priority,
        tags: task.tags,
      },
      session.userId,
      session.token,
    );
  }

  /** The signed-in user and token, or null when the list is local only. */
  private cloudSession(): CloudSession | null {
    const userId = this.userId();
    if (!userId) {
      return null;
    }

    const token = this.userService.accessToken();
    if (!token) {
      console.error('No access token found');
      return null;
    }

    return { userId, token };
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private async copyTaskText(task: Task): Promise<void> {
    const text = [task.title.trim(), task.description?.trim()].filter(Boolean).join('\n');
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.snackbar.open(this.translate.instant('TASKS.COPIED_TO_CLIPBOARD'), '', {
        duration: 2200,
      });
    } catch (error) {
      console.error('Failed to copy task text:', error);
    }
  }
}
