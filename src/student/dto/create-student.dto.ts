import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsArray,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ description: 'Student name', example: 'Sarah Johnson' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Student email', example: 'sarah@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Temporary password', example: 'TempPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Subject', example: 'Mathematics' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Current level', example: 'Grade 8' })
  @IsString()
  @IsNotEmpty()
  currentLevel: string;

  @ApiProperty({ description: 'Learning goals', example: ['Improve algebra fundamentals'] })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(0)
  learningGoals?: string[];

  @ApiProperty({ description: 'Weak areas', example: ['Linear equations'] })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(0)
  weakAreas?: string[];
}