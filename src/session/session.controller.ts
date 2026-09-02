import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { CreateSessionDto } from './dto/create-session.dto';

import { Role } from 'src/common/enum/role.enum';
import { SessionsService } from './session.service';
import { Roles } from 'src/common/decorator/role.decorator';
import { type AuthedRequest } from 'src/common/utils/common.types';
import { UpdateNotesDto } from './dto/update-notes.dto';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @ApiOperation({ summary: 'Create a session' })
  @Post()
  @Roles(Role.TUTOR)
  create(@Body() dto: CreateSessionDto, @Req() req: AuthedRequest) {
    return this.service.createSession(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all sessions' })
  @Get()
  @Roles(Role.TUTOR)
  findAll(
    @Req() req: AuthedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.service.findAllSessions(
      req.user.userId,
      page,
      limit,
      status,
    );
  }

  @ApiOperation({ summary: 'Get session by id' })
  @Get(':id')
  @Roles(Role.TUTOR)
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.findOneSession(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Update session notes' })
  @Patch(':id/notes')
  @Roles(Role.TUTOR)
  updateNotes(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateNotesDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.updateNotes(id, dto.notes, req.user.userId);
  }

  @ApiOperation({ summary: 'Start session' })
  @Post(':id/start')
  @Roles(Role.TUTOR)
  start(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.startSession(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Complete session' })
  @Post(':id/complete')
  @Roles(Role.TUTOR)
  complete(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.completeSession(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Generate AI pre-session plan' })
  @Post(':id/ai-plan')
  @Roles(Role.TUTOR)
  generateAiPlan(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.generateAiPlan(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Generate AI post-session debrief' })
  @Post(':id/ai-debrief')
  @Roles(Role.TUTOR)
  generateAiDebrief(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.generateAiDebrief(id, req.user.userId);
  }
}