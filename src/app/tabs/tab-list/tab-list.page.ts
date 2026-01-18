import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AlertController,
  IonicModule,
  ItemReorderEventDetail,
} from '@ionic/angular';
import { UserService } from 'src/app/core/services/user-service/user.service';
import { TaskSupabaseService } from '../../core/services/task-supabase.service';
import { TaskService } from '../../core/services/task.service';
import { AlertMessages } from '../../core/types/alert-messages';
import { TaskForm } from './task.form';
import { StatusEnum } from './types/statusEnum';
import { Task, TaskDTO } from './types/task';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab-list.page.html',
  styleUrls: ['tab-list.page.scss'],
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
})
export class TabListPage extends TaskForm {
  private readonly taskSupabaseService = inject(TaskSupabaseService);
  private readonly alertController = inject(AlertController);
  protected readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);

  protected alertMessages = AlertMessages;

  protected canClick = signal(true);
  protected hasNewTask = signal(false);
  protected isDisabled = signal(false);
  protected mustRotate = signal(false);
  protected isFormVisible = signal(false);

  protected filter = this.taskService.filter;
  protected shouldShowInstall = this.taskService.shouldShowInstall;
  protected tasks = this.taskService.tasks;
  protected userId = this.taskService.userId;

  public filteredTasks = computed(() => {
    switch (this.filter()) {
      case StatusEnum.All:
        return this.tasks();
      case StatusEnum.Done:
        return this.tasks().filter((task) => task.done);
      case StatusEnum.Undone:
        return this.tasks().filter((task) => !task.done);
    }
  });

  protected alternativeFilterInfo = computed(() => {
    const currentFilter = this.filter();
    const allTasks = this.tasks();
    const hasFilteredTasks = this.filteredTasks().length > 0;
    const hasTasks = allTasks.length > 0;

    // If there are filtered tasks or no tasks at all, return null
    if (hasFilteredTasks || !hasTasks) {
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
        label: undoneTasks === 1 ? 'pending task' : 'pending tasks',
      };
    } else if (currentFilter === StatusEnum.Undone && doneTasks > 0) {
      return {
        count: doneTasks,
        filter: StatusEnum.Done,
        label: doneTasks === 1 ? 'completed task' : 'completed tasks',
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

  protected alertEditButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: (data: Task) => {
        const id = data.id;
        const updatedTitle = data.title;
        const updatedDescription = data.description;
        this.editTask(id, updatedTitle, updatedDescription);
      },
    },
  ];

  protected installButtons = [
    {
      text: 'OK',
      role: 'cancel',
    },
    {
      text: "Don't show again",
      role: 'confirm',
      handler: () => {
        this.shouldShowInstall.set(false);
        localStorage.setItem('install', 'false');
      },
    },
  ];

  constructor() {
    super();
    effect(async () => {
      await this.taskService.saveTasks(this.tasks());
      this.canClick.set(false);
      this.isDisabled.set(true);

      setTimeout(() => {
        this.reorderTasksByState(this.tasks());
        this.canClick.set(true);
        this.isDisabled.set(false);
      }, 500);
    });

    effect(() => {
      this.taskService.saveFilter(this.filter());
    });
  }

  protected async presentEditAlert(task: Task): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Edit Task',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Title',
          value: task.title,
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description',
          value: task.description,
        },
        {
          name: 'id',
          value: task.id,
          attributes: {
            type: 'hidden',
          },
        },
      ],
      buttons: this.alertEditButtons,
    });

    await alert.present();
  }

  protected refresh(): void {
    this.userService.getUser();

    this.mustRotate.set(true);
    setTimeout(() => {
      this.mustRotate.set(false);
    }, 500);
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
    };

    this.tasks.update((tasks) => [...tasks, task as Task]);

    this.form.reset();

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
    if (!this.canClick) {
      return;
    }

    console.log('Toggling task state for taskId:', taskId); //this logs undefined

    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );
  }

  protected handleManualReorder(
    event: CustomEvent<ItemReorderEventDetail>
  ): void {
    const items = [...this.tasks()];
    const movedItem = items.splice(event.detail.from, 1)[0];
    items.splice(event.detail.to, 0, movedItem);
    this.tasks.set(items);
    event.detail.complete();
  }

  private reorderTasksByState(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }

  protected editTask(id: number, title: string, description: string): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, title, description } : task
      )
    );

    if (this.userId()) {
      const task: TaskDTO = {
        id,
        title,
        description,
      };

      const pinHash = this.userService.pinHash();
      if (!pinHash) {
        console.error('No PIN hash found');
        return;
      }

      this.taskSupabaseService.editTask(
        task,
        this.userId(),
        pinHash
      );
    }
  }

  protected deleteTask(taskId: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  protected isTabletOrDesktop(): boolean {
    return window.matchMedia('(min-width: 768px)').matches;
  }
}
