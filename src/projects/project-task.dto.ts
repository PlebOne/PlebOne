import { IsString, IsOptional, IsEnum, IsHexadecimal, MaxLength } from 'class-validator';
import { TaskType, TaskStatus } from './project-task.entity';

export class CreateProjectTaskDto {
  @IsEnum(TaskType)
  type: TaskType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsHexadecimal()
  @IsOptional()
  authorPubkey?: string;

  @IsString()
  @IsOptional()
  nostrEventId?: string;
}

export class UpdateProjectTaskDto {
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  adminNotes?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}

export class SubmitTaskWithNostrDto {
  @IsEnum(TaskType)
  type: TaskType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  // The signed Nostr event from the user
  signedEvent: any;
}
