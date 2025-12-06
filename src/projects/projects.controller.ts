import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectTaskService } from './project-task.service';
import { TaskCommentService } from './task-comment.service';
import { CreateProjectTaskDto } from './project-task.dto';
import { CreateCommentDto } from './task-comment.dto';
import { NostrService } from '../config/nostr.service';

@Controller('api/projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly taskService: ProjectTaskService,
    private readonly commentService: TaskCommentService,
    private readonly nostrService: NostrService,
  ) {}

  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/tasks')
  async getProjectTasks(@Param('id') projectId: string) {
    return this.taskService.findAllByProject(projectId);
  }

  @Get(':id/tasks/stats')
  async getProjectTaskStats(@Param('id') projectId: string) {
    return this.taskService.getStats(projectId);
  }

  @Post(':id/tasks')
  async createTask(
    @Param('id') projectId: string,
    @Body() body: { task: CreateProjectTaskDto; signedEvent?: any },
  ) {
    const { task: taskDto, signedEvent } = body;

    // If a signed Nostr event is provided, verify and publish it
    if (signedEvent) {
      const isValid = await this.nostrService.verifyEvent(signedEvent);
      if (!isValid) {
        throw new BadRequestException('Invalid Nostr event signature');
      }

      // Set the author pubkey from the signed event
      taskDto.authorPubkey = signedEvent.pubkey;

      // Create the task first
      const task = await this.taskService.create(projectId, taskDto);

      // Publish the event to Nostr relays
      const eventId = await this.nostrService.publishSignedEvent(signedEvent);
      if (eventId) {
        await this.taskService.setNostrEventId(task.id, eventId);
        task.nostrEventId = eventId;
      }

      return task;
    }

    // Create task without Nostr (anonymous submission)
    return this.taskService.create(projectId, taskDto);
  }

  // ============================================
  // Comments Endpoints
  // ============================================

  @Get('tasks/:taskId/comments')
  async getTaskComments(@Param('taskId') taskId: string) {
    return this.commentService.findByTask(taskId);
  }

  @Post('tasks/:taskId/comments')
  async addComment(
    @Param('taskId') taskId: string,
    @Body() body: { comment: CreateCommentDto; signedEvent?: any },
  ) {
    const { comment: commentDto, signedEvent } = body;

    // If a signed Nostr event is provided, verify and publish it
    if (signedEvent) {
      const isValid = await this.nostrService.verifyEvent(signedEvent);
      if (!isValid) {
        throw new BadRequestException('Invalid Nostr event signature');
      }

      // Set the author pubkey from the signed event
      commentDto.authorPubkey = signedEvent.pubkey;

      // Create the comment first
      const comment = await this.commentService.create(taskId, commentDto);

      // Publish the event to Nostr relays
      const eventId = await this.nostrService.publishSignedEvent(signedEvent);
      if (eventId) {
        await this.commentService.setNostrEventId(comment.id, eventId);
        comment.nostrEventId = eventId;
      }

      return comment;
    }

    // Create comment without Nostr (anonymous submission)
    return this.commentService.create(taskId, commentDto);
  }
}
