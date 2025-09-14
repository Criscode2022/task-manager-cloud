export interface Task {
  description: string;
  done: boolean;
  id: number;
  title: string;
  created_at: Date;
  updated_at?: Date;
  user_id: number;
}

export type TaskDTO = Partial<Task>;
