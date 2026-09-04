import {
  IsOptional,
  IsString,
  IsDateString,
  IsMongoId,
  MinLength,
} from 'class-validator';

export class UpdateSessionDto {
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  topic?: string;
}
