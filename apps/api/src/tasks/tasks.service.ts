import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface SerializedTask {
  id: number;
  user_id: number;
  title: string;
  description: string;
  done: boolean;
  priority: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService) {}

  private serializeTask(row: Record<string, unknown>): SerializedTask {
    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      title: String(row.title),
      description: (row.description as string) ?? '',
      done: Boolean(row.done),
      priority: (row.priority as string) || 'medium',
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  async getTaskById(taskId: number): Promise<SerializedTask> {
    const sql = this.db.getSql();
    const rows = await sql`
      SELECT * FROM public.tasks WHERE id = ${taskId} LIMIT 1
    `;
    if (!rows[0]) {
      throw new NotFoundException('Task not found');
    }
    return this.serializeTask(rows[0] as Record<string, unknown>);
  }

  async getTasks(userId: number): Promise<SerializedTask[]> {
    const sql = this.db.getSql();
    const rows = await sql`
      SELECT *
      FROM public.tasks
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map((row) => this.serializeTask(row as Record<string, unknown>));
  }

  async createTask(
    userId: number,
    task: CreateTaskDto,
  ): Promise<SerializedTask> {
    const sql = this.db.getSql();
    const rows = await sql`
      INSERT INTO public.tasks (
        user_id, title, description, done, priority, tags, updated_at
      ) VALUES (
        ${userId},
        ${task.title},
        ${task.description ?? ''},
        ${task.done ?? false},
        ${task.priority || 'medium'},
        ${task.tags || []},
        NOW()
      )
      RETURNING *
    `;
    return this.serializeTask(rows[0] as Record<string, unknown>);
  }

  async requireOwnedTask(
    userId: number,
    taskId: number,
  ): Promise<SerializedTask> {
    const task = await this.getTaskById(taskId);
    if (task.user_id !== userId) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async updateTaskForUser(
    userId: number,
    taskId: number,
    updates: UpdateTaskDto,
  ): Promise<SerializedTask> {
    const current = await this.requireOwnedTask(userId, taskId);
    const sql = this.db.getSql();
    const title = updates.title ?? current.title;
    const description =
      updates.description !== undefined ? updates.description : current.description;
    const done = updates.done !== undefined ? updates.done : current.done;
    const priority = updates.priority ?? current.priority;
    const tags = updates.tags ?? current.tags;

    const rows = await sql`
      UPDATE public.tasks
      SET
        title = ${title},
        description = ${description},
        done = ${done},
        priority = ${priority},
        tags = ${tags},
        updated_at = NOW()
      WHERE id = ${taskId} AND user_id = ${userId}
      RETURNING *
    `;
    if (!rows[0]) {
      throw new NotFoundException('Task not found');
    }
    return this.serializeTask(rows[0] as Record<string, unknown>);
  }

  async deleteTaskForUser(userId: number, taskId: number): Promise<void> {
    await this.requireOwnedTask(userId, taskId);
    const sql = this.db.getSql();
    const rows = await sql`
      DELETE FROM public.tasks
      WHERE id = ${taskId} AND user_id = ${userId}
      RETURNING id
    `;
    if (!rows[0]) {
      throw new NotFoundException('Task not found');
    }
  }

  async deleteAllTasks(userId: number): Promise<void> {
    const sql = this.db.getSql();
    await sql`DELETE FROM public.tasks WHERE user_id = ${userId}`;
  }

  async bulkUploadTasks(
    userId: number,
    tasks: CreateTaskDto[],
  ): Promise<SerializedTask[]> {
    const created: SerializedTask[] = [];
    for (const task of tasks) {
      created.push(await this.createTask(userId, task));
    }
    return created;
  }
}
