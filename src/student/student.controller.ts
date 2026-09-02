import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentFilterDto } from './dto/student-filter.dto';
import { StudentsService } from './student.service';
import { Roles } from 'src/common/decorator/role.decorator';
import { Role } from 'src/common/enum/role.enum';
import { type AuthedRequest } from 'src/common/utils/common.types';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @ApiOperation({ summary: 'Create a student' })
  @Post()
  @Roles(Role.TUTOR)
  create(@Body() dto: CreateStudentDto, @Req() req: AuthedRequest) {
    return this.service.createStudent(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all students' })
  @Get()
  @Roles(Role.TUTOR)
  findAll(
    @Req() req: AuthedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() filters: StudentFilterDto,
  ) {
    return this.service.findAllStudents(req.user.userId, page, limit, filters);
  }

  @ApiOperation({ summary: 'Get student dashboard data' })
  @Get('dashboard')
  async getDashboard(@Req() req: AuthedRequest) {
    return this.service.getDashboard(req.user.userId);
  }

  @ApiOperation({ summary: 'Get student sessions' })
  @Get('sessions')
  async getSessions(@Req() req: AuthedRequest) {
    return this.service.getSessions(req.user.userId);
  }

  @ApiOperation({ summary: 'Get a specific session (read-only)' })
  @Get('sessions/:id')
  async getSession(
    @Param('id', ParseObjectIdPipe) sessionId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.getSession(sessionId, req.user.userId);
  }

  @ApiOperation({ summary: 'Get student dashboard with session timeline' })
  @Get(':id/dashboard')
  @Roles(Role.TUTOR)
  getStudentDashboard(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.getStudentDashboard(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Get student by id' })
  @Get(':id')
  @Roles(Role.TUTOR)
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.findOneStudent(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Update student' })
  @Patch(':id')
  @Roles(Role.TUTOR)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.updateStudent(id, dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete student' })
  @Delete(':id')
  @Roles(Role.TUTOR)
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.service.deleteStudent(id, req.user.userId);
  }
}
