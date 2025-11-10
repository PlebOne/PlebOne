import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('api/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async findAll(@Query('tag') tag?: string) {
    const posts = await this.blogService.findAll();
    
    if (tag) {
      return posts.filter(post => post.tags && post.tags.includes(tag));
    }
    
    return posts;
  }

  @Get('tags')
  async getAllTags() {
    const posts = await this.blogService.findAll();
    const tagSet = new Set<string>();
    
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet).sort();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }
}
