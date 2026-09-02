import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import mongoose, { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { Role } from 'src/common/enum/role.enum';
import * as bcrypt from 'bcrypt';
import { GenericDatabase } from 'src/helpers/genericDatabase';
import { UserDocument, UserSchemaName } from 'src/model/user.schema';

@Injectable()
export class UserService extends GenericDatabase<Model<UserDocument>> {
  constructor(
    @InjectModel(UserSchemaName)
    private readonly model: Model<UserDocument>,
  ) {
    super(model);
  }

  async validateUser(
    username: string,
    pass: string,
  ): Promise<UserDocument | null> {
    try {
      const normalizedUsername = username.toLowerCase().trim();

      const user: UserDocument | null = await this.model
        .findOne({
          username: normalizedUsername,
          isActive: true,
          isDeleted: false,
        })
        .select('+password');

      if (!user) {
        return null;
      }

      const passwordMatches = await bcrypt.compare(pass, user.password);

      if (!passwordMatches) {
        return null;
      }

      return user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error validating user:', error);
        throw new NotFoundException(error.message);
      }
      console.error('Unknown error validating user:', error);
      throw error;
    }
  }
  async createUser(dto: CreateUserDto, createdBy?: string) {
    try {
      // Check if username exists
      const existingUser = await this.genericFindOne({
        username: dto.username,
      });
      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }

      // Check if email exists
      if (dto.email) {
        const existingEmail = await this.genericFindOne({
          email: dto.email,
          isDeleted: false,
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      const data: UserDocument = await this.genericCreateOne({
        ...dto,
        password: hashedPassword,
        createdBy: createdBy ? new Types.ObjectId(createdBy) : null,
        role: dto.role || Role.STUDENT,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      // Remove password from response
      const { password, ...result } = data.toObject();

      return {
        success: true,
        message: 'User created successfully',
        data: result,
        statusCode: HttpStatus.CREATED,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error creating user', error.message);
        throw new BadRequestException(error.message);
      }
      console.log('Error creating user', error);
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAllUsers(
    userId: string,
    page: number,
    limit: number,
    filters?: UserFilterDto,
  ) {
    try {
      // Get current user to check role
      const currentUser = await this.genericFindOne({
        _id: userId,
        isDeleted: false,
      });

      if (!currentUser) {
        throw new BadRequestException('User not found');
      }

      const match: mongoose.QueryFilter<UserDocument> = {
        isDeleted: false,
      };

      // If not tutor, only show themselves
      if (currentUser.role === Role.STUDENT) {
        match._id = new Types.ObjectId(userId);
      }

      // If tutor, show all users (tutors and students)
      if (currentUser.role === Role.TUTOR) {
        // Tutors can see all users
      }

      if (filters) {
        if (filters.search) {
          match.$or = [
            { username: { $regex: filters.search, $options: 'i' } },
            { firstName: { $regex: filters.search, $options: 'i' } },
            { lastName: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
          ];
        }

        if (filters.role) {
          match.role = filters.role;
        }

        if (filters.isActive !== undefined) {
          match.isActive = filters.isActive;
        }
      }

      const skip = (page - 1) * limit;

      const result = await this.model.aggregate([
        { $match: match },
        {
          $project: {
            username: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            role: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);

      const resultData = result[0] || {};

      return {
        success: true,
        data: resultData.data || [],
        pagination: {
          totalCount: resultData.totalCount?.[0]?.count || 0,
          page,
          limit,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error while fetching users', error.message);
        throw new BadRequestException(error.message);
      }
      console.log('Error while fetching users', error);
      throw new BadRequestException('Error while fetching users');
    }
  }

  async findOneUser(id: string) {
    try {
      const result = await this.model.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id),
            isDeleted: false,
          },
        },
        {
          $project: {
            username: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            role: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      if (!result.length) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error while fetching user', error.message);
        throw new BadRequestException(error.message);
      }
      console.log('Error while fetching user', error);
      throw new BadRequestException('Error while fetching user');
    }
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    try {
      const exist: UserDocument | null = await this.genericFindOne({
        _id: id,
        isDeleted: false,
      });

      if (!exist) {
        throw new BadRequestException('User not found');
      }

      // Check if username is taken by another user
      if (dto.username && dto.username !== exist.username) {
        const existingUser = await this.genericFindOne({
          username: dto.username,
          _id: { $ne: new Types.ObjectId(id) },
          isDeleted: false,
        });
        if (existingUser) {
          throw new BadRequestException('Username already exists');
        }
      }

      // Check if email is taken by another user
      if (dto.email && dto.email !== exist.email) {
        const existingEmail = await this.genericFindOne({
          email: dto.email,
          _id: { $ne: new Types.ObjectId(id) },
          isDeleted: false,
        });
        if (existingEmail) {
          throw new BadRequestException('Email already exists');
        }
      }

      // Hash password if provided
      let updateData: any = { ...dto };
      if (dto.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(dto.password, salt);
      }

      const data: UserDocument | null = await this.genericUpdateOne(
        id,
        updateData,
      );

      if (!data) {
        throw new BadRequestException('User not found');
      }

      // Remove password from response
      const { password, ...result } = data.toObject();

      return {
        success: true,
        message: 'User updated successfully',
        data: result,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error updating user', error.message);
        throw new BadRequestException(error.message);
      }
      console.log('Error updating user', error);
      throw new BadRequestException('Failed to update user');
    }
  }

  async deleteUser(id: string) {
    try {
      const exist: UserDocument | null = await this.genericFindOne({
        _id: id,
        isDeleted: false,
      });

      if (!exist) {
        throw new BadRequestException('User not found');
      }

      const data: UserDocument | null = await this.genericDeleteOne(id);

      if (!data) {
        throw new BadRequestException('User not found');
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error while deleting user', error.message);
        throw new BadRequestException(error.message);
      }
      console.log('Error while deleting user', error);
      throw new BadRequestException('Error while deleting user');
    }
  }

  async validateAuthenticatedUser(userId: string): Promise<UserDocument> {
    const user = await this.genericFindOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    });

    if (!user) {
      throw new BadRequestException('User not found or inactive');
    }

    return user;
  }

  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.genericFindOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });
  }
}
