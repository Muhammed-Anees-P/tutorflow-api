import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorator/public.decorator';
import { LoginDto } from './dto/Login.DTO';
import { ApiOperation } from '@nestjs/swagger';
import { type AuthedRequest } from 'src/common/utils/common.types';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * HTTP POST endpoint for user login.
   *
   * This endpoint accepts a LoginDto payload in the request body,
   * validates the user credentials, and returns a JWT access token upon successful authentication.
   *
   * @param {LoginDto} loginDto - The DTO containing username and password.
   * @returns {Promise<{access_token: string}>} - The JWT access token.
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  async getMe(@Req() req: AuthedRequest) {
    return this.authService.getMe(req.user.userId);
  }
}
