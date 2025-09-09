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
import { TaskHttpService } from '../../core/services/task-http.service';
import { TaskService } from '../../core/services/task.service';
import { AlertMessages } from '../../core/types/alert-messages';
import { TaskForm } from './task.form';
import { StatusEnum } from './types/statusEnum';
import { Task } from './types/task';

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
  private readonly http = inject(TaskHttpService);
  private readonly alertController = inject(AlertController);
  protected readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);

  protected alertMessages = AlertMessages;

  protected canClick = signal(true);
  protected hasNewTask = signal(false);
  protected isDisabled = signal(false);
  protected mustRotate = signal(false);

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

  protected alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: () => {
        this.deleteAllTasks();
      },
    },
  ];

  protected alertButtonsOnline = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
  ];

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

  protected addTask(): void {
    if (!(this.form.valid && this.title?.value)) {
      console.error('Invalid form, please check the inputs');
      return;
    }

    const task: Task = {
      id: Date.now(),
      title: this.title?.value,
      description: this.description?.value ?? '',
      done: false,
    };

    this.tasks.update((tasks) => [...tasks, task]);

    this.form.reset();

    this.hasNewTask.set(true);
    setTimeout(() => {
      this.hasNewTask.set(false);
    }, 1000);
  }

  protected toggleTaskState(taskId: number): void {
    if (!this.canClick) {
      return;
    }

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
  }

  protected deleteTask(taskId: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  protected deleteAllTasks(): void {
    this.tasks.set([]);
  }
}
