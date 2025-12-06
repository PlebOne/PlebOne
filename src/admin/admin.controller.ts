import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { BlogService } from '../blog/blog.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectTaskService } from '../projects/project-task.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from '../blog/blog-post.dto';
import { CreateProjectDto, UpdateProjectDto } from '../projects/project.dto';
import { UpdateProjectTaskDto } from '../projects/project-task.dto';
import { TaskStatus } from '../projects/project-task.entity';
import { SettingsService } from '../config/settings.service';
import { NostrService } from '../config/nostr.service';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly blogService: BlogService,
    private readonly projectsService: ProjectsService,
    private readonly taskService: ProjectTaskService,
    private readonly settingsService: SettingsService,
    private readonly nostrService: NostrService,
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

  // Settings endpoints
  @Get('settings/nostr-relays')
  async getNostrRelays() {
    return {
      relays: await this.settingsService.getRelays(),
    };
  }

  @Post('settings/nostr-relays')
  async setNostrRelays(@Body() body: { relays: string[] }) {
    await this.settingsService.setRelays(body.relays);
    return { message: 'Nostr relays updated successfully', relays: body.relays };
  }

  // Nostr publishing endpoint
  @Post('blog/:id/publish-nostr')
  async publishBlogPostToNostr(@Param('id') id: string, @Body() body: { signedEvent: any }) {
    const eventId = await this.nostrService.publishSignedEvent(body.signedEvent);
    if (eventId) {
      await this.blogService.updateNostrEventId(id, eventId);
    }
    return { 
      message: eventId ? 'Published to Nostr successfully' : 'Failed to publish to Nostr',
      eventId,
    };
  }

  // Task management endpoints
  @Get('tasks')
  async getAllTasks() {
    // Get all tasks across all projects for admin view
    const projects = await this.projectsService.findAllAdmin();
    const tasksPromises = projects.map(async (project) => {
      const tasks = await this.taskService.findAllByProject(project.id);
      return tasks.map(task => ({ ...task, projectName: project.name }));
    });
    const tasksArrays = await Promise.all(tasksPromises);
    return tasksArrays.flat().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  @Get('projects/:projectId/tasks')
  async getProjectTasks(@Param('projectId') projectId: string) {
    return this.taskService.findAllByProject(projectId);
  }

  @Put('tasks/:id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateProjectTaskDto,
  ) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Put('tasks/:id/status')
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: { status: TaskStatus; adminNotes?: string },
  ) {
    const task = await this.taskService.updateStatus(id, body.status, body.adminNotes);
    return task;
  }

  @Put('tasks/:id/priority')
  async toggleTaskPriority(@Param('id') id: string) {
    return this.taskService.togglePriority(id);
  }

  @Put('tasks/:id/ignored')
  async toggleTaskIgnored(@Param('id') id: string) {
    return this.taskService.toggleIgnored(id);
  }

  @Put('tasks/:id/complete')
  async markTaskCompleted(@Param('id') id: string) {
    return this.taskService.markCompleted(id);
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string) {
    await this.taskService.remove(id);
    return { message: 'Task deleted successfully' };
  }

  // Publish a reply to a task's original Nostr event
  @Post('tasks/:id/reply-nostr')
  async publishTaskReply(
    @Param('id') id: string,
    @Body() body: { signedEvent: any },
  ) {
    const task = await this.taskService.findOne(id);
    
    if (!task.nostrEventId) {
      return { message: 'Task has no associated Nostr event', eventId: null };
    }

    const eventId = await this.nostrService.publishReply(body.signedEvent);
    return {
      message: eventId ? 'Reply published to Nostr successfully' : 'Failed to publish reply',
      eventId,
    };
  }
}
