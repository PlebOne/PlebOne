import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AuthController } from './auth.controller';
import { BlogModule } from '../blog/blog.module';
import { ProjectsModule } from '../projects/projects.module';
import { Settings } from '../config/settings.entity';
import { SettingsService } from '../config/settings.service';
import { NostrService } from '../config/nostr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settings]),
    BlogModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [AdminController, AuthController],
  providers: [SettingsService, NostrService],
  exports: [NostrService, SettingsService],
})
export class AdminModule {}
