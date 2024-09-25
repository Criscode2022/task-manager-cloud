import { Component, inject, OnInit, signal } from '@angular/core';
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';
import { StatusEnum } from '../tab-list/types/statusEnum';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
})
export class TabsPage implements OnInit {
  private http = inject(TaskHttpService);
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

      const userId = this.taskService.userId();
      if (userId !== null && userId !== undefined) {
        this.http.download(userId);
      } else {
        console.error('User ID is null');
      }
    });
  }
}
