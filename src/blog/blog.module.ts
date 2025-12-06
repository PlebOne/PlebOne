import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './blog-post.entity';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { Settings } from '../config/settings.entity';
import { SettingsService } from '../config/settings.service';
import { NostrService } from '../config/nostr.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost, Settings])],
  controllers: [BlogController],
  providers: [BlogService, SettingsService, NostrService],
  exports: [BlogService],
})
export class BlogModule {}
