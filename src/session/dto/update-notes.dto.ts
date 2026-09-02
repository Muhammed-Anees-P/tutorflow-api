import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotesDto {
  @ApiProperty({
    description: 'Session notes content',
    example: 'Today we covered linear equations...',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
