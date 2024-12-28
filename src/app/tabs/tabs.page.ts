import { Component, inject, OnInit } from '@angular/core';
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
})
export class TabsPage implements OnInit {
  private http = inject(TaskHttpService);
  private themeService = inject(ThemeService);
  private taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  ngOnInit(): void {
    this.themeService.setTheme();

    this.checkInstallAlert();

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

  private checkInstallAlert(): void {
    console.log('install', localStorage.getItem('install'));
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      localStorage.getItem('install') === 'false'
    ) {
      console.log('install', localStorage.getItem('install'));
      console.log('shouldShowInstall', this.taskService.shouldShowInstall());
      this.taskService.shouldShowInstall.set(false);
    }
  }
}
