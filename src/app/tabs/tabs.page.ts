import { Component, inject, OnInit, signal } from '@angular/core';
import { TaskService } from '../core/services/task.service';
import { StatusEnum } from '../tab-list/types/statusEnum';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
})
export class TabsPage implements OnInit {
  private taskService = inject(TaskService);
  protected filter = signal<StatusEnum>(StatusEnum.All);
  private tasks = this.taskService.tasks;

  async ngOnInit() {
    this.taskService.storageInitialized.subscribe(async () => {
      this.filter.set(await this.taskService.getFilter());
      this.tasks.set(await this.taskService.getTasks());
      this.taskService.userId.set(
        await this.taskService._storage?.get('userId')
      );
    });
  }
}
