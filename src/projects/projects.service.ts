import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllAdmin(): Promise<Project[]> {
    return this.projectRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create(createProjectDto);
    return this.projectRepository.save(project);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Project not found');
    }
  }
}
