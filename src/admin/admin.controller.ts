import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { BlogService } from '../blog/blog.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from '../blog/blog-post.dto';
import { CreateProjectDto, UpdateProjectDto } from '../projects/project.dto';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly blogService: BlogService,
    private readonly projectsService: ProjectsService,
  ) {}

  // Blog post admin endpoints
  @Get('blog')
  async getAllBlogPosts() {
    return this.blogService.findAllAdmin();
  }

  @Post('blog')
  async createBlogPost(@Body() createBlogPostDto: CreateBlogPostDto) {
    return this.blogService.create(createBlogPostDto);
  }

  @Put('blog/:id')
  async updateBlogPost(@Param('id') id: string, @Body() updateBlogPostDto: UpdateBlogPostDto) {
    return this.blogService.update(id, updateBlogPostDto);
  }

  @Delete('blog/:id')
  async deleteBlogPost(@Param('id') id: string) {
    await this.blogService.remove(id);
    return { message: 'Blog post deleted successfully' };
  }

  // Project admin endpoints
  @Get('projects')
  async getAllProjects() {
    return this.projectsService.findAllAdmin();
  }

  @Post('projects')
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Put('projects/:id')
  async updateProject(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete('projects/:id')
  async deleteProject(@Param('id') id: string) {
    await this.projectsService.remove(id);
    return { message: 'Project deleted successfully' };
  }
}
