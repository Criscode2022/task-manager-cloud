import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TasksService } from './tasks.service';

function fakeDb(rows: Record<string, unknown>[]): DatabaseService {
  const sql = Object.assign(
    async () => rows,
    {},
  );
  return { getSql: () => sql } as unknown as DatabaseService;
}

const owned = {
  id: 7,
  user_id: 1,
  title: 'Buy milk',
  description: '',
  done: false,
  priority: 'medium',
  tags: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('TasksService', () => {
  it('rejects updates of another user\'s task without confirming it exists', async () => {
    const service = new TasksService(fakeDb([owned]));

    await expect(
      service.updateTaskForUser(99, 7, { done: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deletes of another user\'s task', async () => {
    const service = new TasksService(fakeDb([owned]));

    await expect(service.deleteTaskForUser(99, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
