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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserService } from './user.service';
import { Role } from 'src/common/enum/role.enum';
import { type AuthedRequest } from 'src/common/utils/common.types';
import { Roles } from 'src/common/decorator/role.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @ApiOperation({ summary: 'Create user' })
  @Post()
  @Roles(Role.TUTOR)
  create(@Body() dto: CreateUserDto, @Req() req: AuthedRequest) {
    return this.service.createUser(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() filters: UserFilterDto,
  ) {
    return this.service.findAllUsers(req.user.userId, page, limit, filters);
  }

  @ApiOperation({ summary: 'Get user by id' })
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOneUser(id);
  }

  @ApiOperation({ summary: 'Update user' })
  @Patch(':id')
  @Roles(Role.TUTOR)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(id, dto);
  }

  @ApiOperation({ summary: 'Delete user' })
  @Delete(':id')
  @Roles(Role.TUTOR)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.deleteUser(id);
  }
}
