export class AlertMessages {
  protected downloadAlert =
    'Important: This will OVERWRITE your current offline tasks';

  protected infoAlert =
    'Upload the tasks to get an user ID, which you can use to sync your tasks on any device. Tasks are automatically synced on changes until you delete your user ID.';

  protected deleteUserAlert =
    'Are you sure that you want to delete your User ID? This will delete all your tasks from the cloud but will keep them offline';

  protected deleteTasksAlert =
    'Are you sure that you want to delete all your tasks from the device? This action CANNOT be undone';

  protected deleteTasksAlertOnline =
    'To delete all your tasks from this device, you need to be in offline mode';
}
