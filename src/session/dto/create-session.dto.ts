import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Date and time', example: '2026-09-02T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiProperty({ description: 'Session topic', example: 'Linear Equations' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  topic: string;
}