import { Component, inject, OnInit, signal } from '@angular/core';
import { AlertController, ItemReorderEventDetail } from '@ionic/angular';
import { TaskService } from '../core/services/task.service';
import { Task } from '../shared/types/Task';
import { TaskForm } from './task.form';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page extends TaskForm implements OnInit {
  protected tasks = signal<Task[]>([]);
  protected canClick = signal(true);
  protected isDisabled = signal(false);

  private nextId = 0;

  private taskService = inject(TaskService);
  private alertController = inject(AlertController);

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

  async ngOnInit() {
    this.taskService.storageInitialized.subscribe(async () => {
      const storedTasks = await this.taskService.getTasks();
      this.tasks.set(storedTasks);
      this.nextId =
        storedTasks.length > 0
          ? Math.max(...storedTasks.map((t: any) => t.id)) + 1
          : 0;
    });

    this.taskService.tasksUpdated.subscribe(async () => {
      const storedTasks = await this.taskService.getTasks();
      this.tasks.set(storedTasks);
    });
  }

  protected addTask() {
    if (this.form.invalid) {
      console.error('Invalid form, please check the inputs');
      return;
    }

    if (this.title?.value && this.description?.value) {
      const task: Task = {
        id: this.nextId++,
        title: this.title?.value,
        description: this.description?.value,
        done: false,
      };

      this.taskService.addTask(task);
      this.form.reset();
    }
  }

  protected toggleTaskCompletion(taskId: number) {
    if (!this.canClick) {
      return;
    }

    this.canClick.set(false);
    this.toggleReorder();
    this.tasks.update((tasks) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );

      this.tasks.set(updatedTasks);

      setTimeout(() => {
        this.tasks.set(this.reorderTasks(updatedTasks));
        this.taskService.saveTasks(this.tasks());
        this.canClick.set(true);
        this.toggleReorder();
      }, 500);

      return updatedTasks;
    });
  }

  protected editTask(id: number, title: string, description: string) {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, title, description } : task
      )
    );
    this.taskService.saveTasks(this.tasks());
  }

  protected handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const items = [...this.tasks()];
    const movedItem = items.splice(event.detail.from, 1)[0];
    items.splice(event.detail.to, 0, movedItem);
    this.tasks.set(items);
    this.taskService.saveTasks(this.tasks());
    event.detail.complete();
  }

  private reorderTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }

  protected deleteTask(taskId: number) {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
    this.taskService.saveTasks(this.tasks());
  }

  protected deleteAllTasks() {
    this.tasks.set([]);
    this.taskService.saveTasks(this.tasks());
  }

  private toggleReorder() {
    this.isDisabled.set(!this.isDisabled());
  }
}
