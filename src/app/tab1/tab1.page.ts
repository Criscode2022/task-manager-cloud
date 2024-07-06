import { Component, inject, OnInit, signal } from '@angular/core';
import { ItemReorderEventDetail } from '@ionic/angular';
import { TaskService } from '../task.service';
import { Task } from '../types/Task';
import { TaskForm } from './task.form';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page extends TaskForm implements OnInit {
  protected tasks = signal<Task[]>([]);
  private nextId = 0;

  protected canClick = true;
  protected isDisabled = false;

  private taskService = inject(TaskService);

  public alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        console.log('Cancel clicked');
      },
    },
    {
      text: 'Confirm',
      role: 'confirm',
      handler: () => {
        this.deleteAllTasks();
      },
    },
  ];

  async ngOnInit() {
    this.taskService.storageInitialized.subscribe(async () => {
      console.log('Storage initialized event received');
      const storedTasks = await this.taskService.getTasks();
      this.tasks.set(storedTasks);
      this.nextId =
        storedTasks.length > 0
          ? Math.max(...storedTasks.map((t: any) => t.id)) + 1
          : 0;
    });

    this.taskService.tasksUpdated.subscribe(async () => {
      console.log('Tasks updated event received');
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
    }
  }

  protected toggleTaskCompletion(taskId: number) {
    if (!this.canClick) {
      return;
    }

    this.canClick = false;
    this.toggleReorder();
    this.tasks.update((tasks) => {
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );

      this.tasks.set(updatedTasks);

      setTimeout(() => {
        this.tasks.set(this.reorderTasks(updatedTasks));
        this.taskService.saveTasks(this.tasks());
        this.canClick = true;
        this.toggleReorder();
      }, 500);

      return updatedTasks;
    });

    console.log('Task toggled with ID:', taskId);
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
    console.log('All tasks deleted');
  }

  private toggleReorder() {
    this.isDisabled = !this.isDisabled;
  }
}
