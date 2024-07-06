import { Component, inject, OnInit, signal } from '@angular/core';
import { TaskHttpService } from '../task-http.service';
import { TaskService } from '../task.service';
import { Task } from '../types/Task'; // Import the correct Task type

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
})
export class Tab2Page implements OnInit {
  private taskService = inject(TaskService);
  private http = inject(TaskHttpService);

  protected tasks = signal<Task[]>([]);
  protected userId: null | number = null;

  protected loading = this.http.loading;
  protected uploading = false;

  public alertButtons = ['Cancel', 'Confirm'];
  public alertInputs = [
    {
      placeholder: 'User ID',
    },
  ];

  ngOnInit(): void {
    this.http.userId?.subscribe((userId) => {
      this.userId = userId;
    });
  }

  protected async upload() {
    this.uploading = true;
    console.log('Uploading tasks...');
    this.taskService.getTasks().then((tasks) => {
      this.tasks.set(tasks);
      console.log(tasks);
      this.http.upload(tasks);
      this.uploading = false;
    });

    // Call the upload method from the TaskHttpService

    // Update the userId property with the value from the TaskHttpService
  }

  protected download() {
    console.log('Downloading tasks...');
  }
}
