import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { CreateBlogPostDto, UpdateBlogPostDto } from './blog-post.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
  ) {}

  async findAll(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      where: { published: true },
      order: { createdAt: 'DESC' },
      select: ['id', 'title', 'content', 'createdAt', 'tags'],
    });
  }

  async findOne(id: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { id, published: true },
    });
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    
    return post;
  }

  async findAllAdmin(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(createBlogPostDto: CreateBlogPostDto): Promise<BlogPost> {
    const post = this.blogPostRepository.create(createBlogPostDto);
    const savedPost = await this.blogPostRepository.save(post);
    return savedPost;
  }

  async update(id: string, updateBlogPostDto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({ where: { id } });
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    
    Object.assign(post, updateBlogPostDto);
    const savedPost = await this.blogPostRepository.save(post);
    return savedPost;
  }

  async updateNostrEventId(id: string, nostrEventId: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({ where: { id } });
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    
    post.nostrEventId = nostrEventId;
    return this.blogPostRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const result = await this.blogPostRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Blog post not found');
    }
  }
}
