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
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';
import { AlertMessages } from '../shared/types/alert-messages';
import { TaskForm } from './task.form';
import { StatusEnum } from './types/statusEnum';
import { Task } from './types/task';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab-list.page.html',
  styleUrls: ['tab-list.page.scss'],
  standalone: true,
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
  private http = inject(TaskHttpService);
  private alertController = inject(AlertController);
  protected taskService = inject(TaskService);

  protected alertMessages = AlertMessages;

  protected canClick = signal(true);
  protected hasNewTask = signal(false);
  protected isDisabled = signal(false);
  protected mustRotate = signal(false);

  protected filter = this.taskService.filter;
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

  constructor() {
    super();
    effect(() => {
      this.taskService.saveTasks(this.tasks());
    });

    effect(() => {
      this.taskService.saveFilter(this.filter());
    });
  }

  protected async presentEditAlert(task: Task) {
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

  protected refresh() {
    this.http.download(this.userId());

    this.mustRotate.set(true);
    setTimeout(() => {
      this.mustRotate.set(false);
    }, 500);
  }

  protected addTask() {
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

  protected toggleTaskState(taskId: number) {
    if (!this.canClick) {
      return;
    }

    this.canClick.set(false);
    this.toggleReorder();
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );

    setTimeout(() => {
      this.tasks.set(this.reorderTasksByState(this.tasks()));
      this.canClick.set(true);
      this.toggleReorder();
    }, 500);
  }

  private toggleReorder() {
    this.isDisabled.set(!this.isDisabled());
  }

  protected handleManualReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const items = [...this.tasks()];
    const movedItem = items.splice(event.detail.from, 1)[0];
    items.splice(event.detail.to, 0, movedItem);
    this.tasks.set(items);
    event.detail.complete();
  }

  private reorderTasksByState(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }

  protected editTask(id: number, title: string, description: string) {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, title, description } : task
      )
    );
  }

  protected deleteTask(taskId: number) {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  protected deleteAllTasks() {
    this.tasks.set([]);
  }
}
