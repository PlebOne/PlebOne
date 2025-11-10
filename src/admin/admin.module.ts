import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthController } from './auth.controller';
import { BlogModule } from '../blog/blog.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [BlogModule, ProjectsModule],
  controllers: [AdminController, AuthController],
})
export class AdminModule {}
