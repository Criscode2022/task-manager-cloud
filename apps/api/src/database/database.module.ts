import { Global, Module, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.db.ensureAuthSchema();
    } catch (error) {
      console.warn(
        '⚠️  Could not ensure auth schema on startup:',
        (error as Error).message,
      );
      console.warn('   API routes that touch the DB will fail until DATABASE_URL is valid.');
    }
  }
}
