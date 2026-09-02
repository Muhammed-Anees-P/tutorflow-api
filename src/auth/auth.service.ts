import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IPayload } from 'src/common/utils/common.types';
import { UserDocument } from 'src/model/user.schema';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials.
   *
   * @param username - The username of the user.
   * @param pass - The password of the user.
   * @returns The user object if validation is successful.
   * @throws UnauthorizedException if credentials are invalid.
   */ async validateUser(
    username: string,
    pass: string,
  ): Promise<UserDocument> {
    const user = await this.usersService.validateUser(username, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return user;
  }

  /**
   * Generates a JWT access token for the authenticated user.
   *
   * @param user - The authenticated user object.
   * @returns An object containing the JWT access token.
   */
  async login(user: UserDocument) {
    const payload: IPayload = {
      username: user.username,
      userId: user._id.toString(),
      roles: [user.role],
      email: user.email ?? '',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      expiredAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.genericFindOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }
}
