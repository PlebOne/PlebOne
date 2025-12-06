import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectsService } from './projects.service';
import { ProjectTaskService } from './project-task.service';
import { ProjectsController } from './projects.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectTask]),
    forwardRef(() => AdminModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectTaskService],
  exports: [ProjectsService, ProjectTaskService],
})
export class ProjectsModule {}
