import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AlertController, ItemReorderEventDetail } from '@ionic/angular';
import { TaskService } from '../core/services/task.service';
import { Task } from '../shared/types/Task';
import { TaskForm } from './task.form';
import { StatusEnum, StatusEnumArray } from './types/statusEnum';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab-list.page.html',
  styleUrls: ['tab-list.page.scss'],
})
export class TabListPage extends TaskForm implements OnInit {
  protected canClick = signal(true);
  protected isDisabled = signal(false);

  private nextId = 0;

  private taskService = inject(TaskService);
  private alertController = inject(AlertController);

  protected tasks = this.taskService.tasks;
  protected filter = signal<StatusEnum>(StatusEnum.All);

  protected indexStatus = computed(() => {
    return StatusEnumArray.indexOf(this.filter());
  });

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
      this.taskService.saveFilter(this.filter());
    });
  }

  async ngOnInit() {
    this.taskService.storageInitialized.subscribe(async () => {
      const storedTasks = await this.taskService.getTasks();
      const storedFilter = await this.taskService.getFilter();
      this.filter.set(storedFilter);
      this.tasks.set(storedTasks);
      this.nextId =
        storedTasks.length > 0
          ? Math.max(...storedTasks.map((t: any) => t.id)) + 1
          : 0;
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

      this.tasks.update((tasks) => [...tasks, task]);

      this.form.reset();
    }
  }

  protected toggleTaskCompletion(taskId: number) {
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
      const tasksReorder = [...this.tasks()];
      this.tasks.set(this.reorderTasks(tasksReorder));
      this.canClick.set(true);
      this.toggleReorder();
    }, 500);
  }

  protected editTask(id: number, title: string, description: string) {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, title, description } : task
      )
    );
  }

  protected handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const items = [...this.tasks()];
    const movedItem = items.splice(event.detail.from, 1)[0];
    items.splice(event.detail.to, 0, movedItem);
    this.tasks.set(items);
    event.detail.complete();
  }

  private reorderTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }

  protected deleteTask(taskId: number) {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  protected deleteAllTasks() {
    this.tasks.set([]);
  }

  protected changeFilter() {
    let index = this.indexStatus();

    index += 1;
    if (index === 3) {
      index = 0;
    }

    this.filter.set(StatusEnumArray[index]);
  }

  private toggleReorder() {
    this.isDisabled.set(!this.isDisabled());
  }
}
