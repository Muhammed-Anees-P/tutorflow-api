import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { ProgressService } from './progress.service';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorator/role.decorator';
import { type AuthedRequest } from 'src/common/utils/common.types';

@ApiTags('Progress')
@Controller('progress')
@Roles(Role.TUTOR)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ApiOperation({ summary: 'Generate progress summary for a student' })
  @Post('students/:id/progress-summary')
  async generateProgressSummary(
    @Param('id', ParseObjectIdPipe) studentId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.progressService.generateProgressSummary(
      studentId,
      req.user.userId,
    );
  }
}
