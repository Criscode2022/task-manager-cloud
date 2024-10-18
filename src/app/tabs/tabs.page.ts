import { Component, inject, OnInit } from '@angular/core';
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
})
export class TabsPage implements OnInit {
  private http = inject(TaskHttpService);
  private taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  ngOnInit(): void {
    this.taskService.storageInitialized.subscribe(async () => {
      if (!this.taskService.storage) {
        return;
      }

      this.tasks.set(await this.taskService.getTasks());
      const userId = await this.taskService.storage?.get('userId');

      if (!userId) {
        return;
      }

      this.http.download(userId);
    });
  }
}
