import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTask, TaskStatus } from './project-task.entity';
import { CreateProjectTaskDto, UpdateProjectTaskDto } from './project-task.dto';
import { Project } from './project.entity';

@Injectable()
export class ProjectTaskService {
  constructor(
    @InjectRepository(ProjectTask)
    private taskRepository: Repository<ProjectTask>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async findAllByProject(projectId: string): Promise<ProjectTask[]> {
    return this.taskRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    return task;
  }

  async create(projectId: string, createTaskDto: CreateProjectTaskDto): Promise<ProjectTask> {
    // Verify project exists
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      projectId,
    });
    
    return this.taskRepository.save(task);
  }

  async update(id: string, updateTaskDto: UpdateProjectTaskDto): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async updateStatus(id: string, status: TaskStatus, adminNotes?: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ 
      where: { id },
      relations: ['project'],
    });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    task.status = status;
    if (adminNotes !== undefined) {
      task.adminNotes = adminNotes;
    }
    
    return this.taskRepository.save(task);
  }

  async togglePriority(id: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    task.priority = !task.priority;
    // If marking as priority, unmark ignored
    if (task.priority) {
      task.ignored = false;
    }
    
    return this.taskRepository.save(task);
  }

  async toggleIgnored(id: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    task.ignored = !task.ignored;
    // If marking as ignored, unmark priority
    if (task.ignored) {
      task.priority = false;
    }
    
    return this.taskRepository.save(task);
  }

  async markCompleted(id: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    task.status = TaskStatus.COMPLETED;
    task.priority = false;
    
    return this.taskRepository.save(task);
  }

  async setNostrEventId(id: string, nostrEventId: string): Promise<ProjectTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    
    task.nostrEventId = nostrEventId;
    return this.taskRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const result = await this.taskRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Task not found');
    }
  }

  async getStats(projectId: string): Promise<{ open: number; inProgress: number; completed: number; closed: number }> {
    const tasks = await this.taskRepository.find({ where: { projectId } });
    
    return {
      open: tasks.filter(t => t.status === TaskStatus.OPEN).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      closed: tasks.filter(t => t.status === TaskStatus.CLOSED).length,
    };
  }
}
