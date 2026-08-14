import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const auth = {
    getUser: async (id: number) => ({ id, created_at: '2026-01-01' }),
    revokeAllSessions: async () => undefined,
  } as unknown as AuthService;
  const tasks = { deleteAllTasks: async () => undefined } as unknown as TasksService;
  const db = { getSql: () => async () => [] } as unknown as DatabaseService;
  const users = new UsersService(auth, db, tasks);

  it('hides another user behind 404', () => {
    expect(() => users.getOwnUser(1, 99)).toThrow(NotFoundException);
  });

  it('returns the caller when ids match', async () => {
    await expect(users.getOwnUser(7, 7)).resolves.toEqual({
      id: 7,
      created_at: '2026-01-01',
    });
  });

  it('refuses to delete someone else', async () => {
    await expect(users.deleteOwnUser(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
