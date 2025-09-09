import { Component, inject, OnInit } from '@angular/core';
import { TaskHttpService } from '../core/services/task-http.service';
import { TaskService } from '../core/services/task.service';
import { ThemeService } from '../core/services/theme.service';
import { UserService } from '../core/services/user-service/user.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  standalone: false,
})
export class TabsPage implements OnInit {
  private readonly http = inject(TaskHttpService);
  private readonly themeService = inject(ThemeService);
  private readonly userService = inject(UserService);
  private readonly taskService = inject(TaskService);

  private tasks = this.taskService.tasks;

  ngOnInit(): void {
    this.themeService.setTheme();

    this.checkInstallAlert();

    this.taskService.storageInitialized.subscribe(async () => {
      if (!this.taskService.storage) {
        return;
      }

      this.userService.getUser();

      this.tasks.set(await this.taskService.getTasks());
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
