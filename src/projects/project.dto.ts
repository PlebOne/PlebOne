import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsUrl()
  @IsOptional()
  repository?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsUrl()
  @IsOptional()
  repository?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
