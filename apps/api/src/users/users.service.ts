import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly auth: AuthService,
    private readonly db: DatabaseService,
    private readonly tasks: TasksService,
  ) {}

  getUser(userId: number) {
    return this.auth.getUser(userId);
  }

  async deleteUser(userId: number): Promise<void> {
    await this.auth.revokeAllSessions(userId);
    await this.tasks.deleteAllTasks(userId);
    const sql = this.db.getSql();
    const rows = await sql`
      DELETE FROM public.users WHERE id = ${userId} RETURNING id
    `;
    if (!rows[0]) {
      throw new NotFoundException('User not found');
    }
  }
}
