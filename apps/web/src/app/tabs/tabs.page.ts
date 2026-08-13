import { Component, effect, inject } from '@angular/core';
import { TaskService } from '../core/services/task.service';
import { ThemeService } from '../core/services/theme.service';
import { UserService } from '../core/services/user-service/user.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  private readonly themeService = inject(ThemeService);
  private readonly userService = inject(UserService);
  private readonly taskService = inject(TaskService);

  constructor() {
    this.themeService.setTheme();
    this.checkInstallAlert();

    effect(() => {
      if (!this.taskService.storageReady()) {
        return;
      }

      void this.loadStoredTasks();
    });
  }

  private async loadStoredTasks(): Promise<void> {
    this.userService.getUser();
    this.taskService.tasks.set(await this.taskService.getTasks());
    this.taskService.tasksHydrated.set(true);
  }

  private checkInstallAlert(): void {
    const hideInstall =
      window.matchMedia('(display-mode: standalone)').matches ||
      localStorage.getItem('install') === 'false';

    if (!hideInstall) {
      return;
    }

    this.taskService.shouldShowInstall.set(false);
  }
}
