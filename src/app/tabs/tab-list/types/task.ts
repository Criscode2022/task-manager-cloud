export interface Task {
  description: string;
  done: boolean;
  id: number;
  title: string;
  created_at?: Date;
}

export type TaskDTO = Partial<Task>;
