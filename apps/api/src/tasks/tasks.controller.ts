import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard, AuthedRequest } from '../auth/auth.guard';
import { BulkTasksDto } from './dto/bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query('userId') userIdRaw?: string,
  ) {
    const userId = Number(userIdRaw || req.auth.userId);
    if (userId !== req.auth.userId) {
      throw new ForbiddenException('Forbidden');
    }
    return this.tasks.getTasks(userId);
  }

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body() body: CreateTaskDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const task = await this.tasks.createTask(req.auth.userId, body);
    res.status(201);
    return task;
  }

  @Post('bulk')
  async bulk(
    @Req() req: AuthedRequest,
    @Body() body: BulkTasksDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tasks = await this.tasks.bulkUploadTasks(req.auth.userId, body.tasks);
    res.status(201);
    return tasks;
  }

  @Put(':id')
  async update(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() body: UpdateTaskDto,
  ) {
    const existing = await this.tasks.getTaskById(taskId);
    if (existing.user_id !== req.auth.userId) {
      throw new ForbiddenException('Forbidden');
    }
    return this.tasks.updateTask(taskId, body);
  }

  @Delete()
  @HttpCode(200)
  async deleteAll(
    @Req() req: AuthedRequest,
    @Query('userId') userIdRaw?: string,
  ) {
    const userId = Number(userIdRaw || req.auth.userId);
    if (userId !== req.auth.userId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.tasks.deleteAllTasks(userId);
    return { ok: true };
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteOne(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) taskId: number,
  ) {
    const existing = await this.tasks.getTaskById(taskId);
    if (existing.user_id !== req.auth.userId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.tasks.deleteTask(taskId);
    return { ok: true };
  }
}
