import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from './task-comment.entity';
import { CreateCommentDto } from './task-comment.dto';
import { ProjectTask } from './project-task.entity';

@Injectable()
export class TaskCommentService {
  constructor(
    @InjectRepository(TaskComment)
    private commentRepository: Repository<TaskComment>,
    @InjectRepository(ProjectTask)
    private taskRepository: Repository<ProjectTask>,
  ) {}

  async findByTask(taskId: string): Promise<TaskComment[]> {
    return this.commentRepository.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(taskId: string, dto: CreateCommentDto, isAdmin = false): Promise<TaskComment> {
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comment = this.commentRepository.create({
      taskId,
      content: dto.content,
      authorPubkey: dto.authorPubkey,
      isAdmin,
    });

    const saved = await this.commentRepository.save(comment);

    // Update the task's updatedAt timestamp
    await this.taskRepository.update(taskId, { updatedAt: new Date() });

    return saved;
  }

  async setNostrEventId(commentId: string, eventId: string): Promise<void> {
    await this.commentRepository.update(commentId, { nostrEventId: eventId });
  }

  async delete(commentId: string): Promise<void> {
    await this.commentRepository.delete(commentId);
  }

  async getCommentCount(taskId: string): Promise<number> {
    return this.commentRepository.count({ where: { taskId } });
  }
}
