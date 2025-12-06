import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';
import { TaskComment } from './task-comment.entity';
import { ProjectsService } from './projects.service';
import { ProjectTaskService } from './project-task.service';
import { TaskCommentService } from './task-comment.service';
import { ProjectsController } from './projects.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectTask, TaskComment]),
    forwardRef(() => AdminModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectTaskService, TaskCommentService],
  exports: [ProjectsService, ProjectTaskService, TaskCommentService],
})
export class ProjectsModule {}
