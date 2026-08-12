export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  description: string;
  done: boolean;
  id: number;
  title: string;
  priority: TaskPriority;
  tags: string[];
  created_at: Date;
  updated_at?: Date;
  user_id: number;
}

export type TaskDTO = Partial<Task>;

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';
