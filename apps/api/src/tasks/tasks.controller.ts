import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthClaims } from '../auth/auth.types';
import { BulkTasksDto } from './dto/bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthClaims) {
    return this.tasks.getTasks(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthClaims, @Body() body: CreateTaskDto) {
    return this.tasks.createTask(user.userId, body);
  }

  @Post('bulk')
  bulk(@CurrentUser() user: AuthClaims, @Body() body: BulkTasksDto) {
    return this.tasks.bulkUploadTasks(user.userId, body.tasks);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthClaims,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasks.updateTaskForUser(user.userId, taskId, body);
  }

  @Delete()
  @HttpCode(200)
  async deleteAll(@CurrentUser() user: AuthClaims) {
    await this.tasks.deleteAllTasks(user.userId);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteOne(
    @CurrentUser() user: AuthClaims,
    @Param('id', ParseIntPipe) taskId: number,
  ) {
    await this.tasks.deleteTaskForUser(user.userId, taskId);
    return { ok: true };
  }
}
