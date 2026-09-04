import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentFilterDto } from './dto/student-filter.dto';
import { Role } from 'src/common/enum/role.enum';
import * as bcrypt from 'bcrypt';
import { GenericDatabase } from 'src/helpers/genericDatabase';
import { StudentDocument, StudentSchemaName } from 'src/model/student.schema';
import { UserDocument, UserSchemaName } from 'src/model/user.schema';
import { SessionDocument, SessionSchemaName } from 'src/model/session.schema';
import { SessionStatus } from 'src/common/enum/session-status.enum';

@Injectable()
export class StudentsService extends GenericDatabase<Model<StudentDocument>> {
  constructor(
    @InjectModel(StudentSchemaName)
    private readonly model: Model<StudentDocument>,
    @InjectModel(UserSchemaName)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(SessionSchemaName)
    private sessionModel: Model<SessionDocument>,
  ) {
    super(model);
  }

  async createStudent(dto: CreateStudentDto, tutorId: string) {
    try {
      // Validate tutor exists
      await this.validateTutor(tutorId);

      // Check if student email already exists
      const existingUser = await this.userModel.findOne({
        email: dto.email.toLowerCase(),
        isDeleted: false,
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      // Create student user account
      const user = await this.userModel.create({
        username: dto.email.split('@')[0] + '_' + Date.now(),
        firstName: dto.name,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        role: Role.STUDENT,
        isActive: true,
        createdBy: new Types.ObjectId(tutorId),
      });

      // Create student profile
      const student = await this.genericCreateOne({
        tutorId: new Types.ObjectId(tutorId),
        userId: user._id,
        name: dto.name,
        subject: dto.subject,
        currentLevel: dto.currentLevel,
        learningGoals: dto.learningGoals || [],
        weakAreas: dto.weakAreas || [],
        createdBy: new Types.ObjectId(tutorId),
      });

      return {
        success: true,
        message: 'Student created successfully',
        data: student,
        statusCode: HttpStatus.CREATED,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create student');
    }
  }

  async findAllStudents(
    tutorId: string,
    page: number,
    limit: number,
    filters?: StudentFilterDto,
  ) {
    try {
      await this.validateTutor(tutorId);

      const match: any = {
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      };

      if (filters) {
        if (filters.search) {
          match.$or = [
            { name: { $regex: filters.search, $options: 'i' } },
            { subject: { $regex: filters.search, $options: 'i' } },
          ];
        }

        if (filters.subject) {
          match.subject = { $regex: filters.subject, $options: 'i' };
        }
      }

      const skip = (page - 1) * limit;

      const result = await this.model.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'sessions',
            let: { studentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$studentId', '$$studentId'] },
                      { $eq: ['$tutorId', new Types.ObjectId(tutorId)] },
                      { $eq: ['$status', 'SCHEDULED'] },
                      { $eq: ['$isDeleted', false] },
                    ],
                  },
                },
              },
              { $sort: { scheduledAt: 1 } },
              { $limit: 1 },
              {
                $project: {
                  scheduledAt: 1,
                  topic: 1,
                  status: 1,
                },
              },
            ],
            as: 'nextSession',
          },
        },
        {
          $project: {
            name: 1,
            subject: 1,
            currentLevel: 1,
            learningGoals: 1,
            weakAreas: 1,
            createdAt: 1,
            updatedAt: 1,
            'user.email': 1,
            'user.isActive': 1,
            nextSession: { $arrayElemAt: ['$nextSession', 0] },
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
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error while fetching students');
    }
  }

  async findOneStudent(studentId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);

      const result = await this.model.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(studentId),
            tutorId: new Types.ObjectId(tutorId),
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'sessions',
            let: { studentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$studentId', '$$studentId'] },
                      { $eq: ['$tutorId', new Types.ObjectId(tutorId)] },
                      { $eq: ['$isDeleted', false] },
                    ],
                  },
                },
              },
              { $sort: { scheduledAt: -1 } },
              {
                $project: {
                  scheduledAt: 1,
                  topic: 1,
                  status: 1,
                  notes: 1,
                  aiPlan: 1,
                  aiDebrief: 1,
                  completedAt: 1,
                  aiReviewedAt: 1,
                },
              },
            ],
            as: 'sessions',
          },
        },
        {
          $project: {
            name: 1,
            subject: 1,
            currentLevel: 1,
            learningGoals: 1,
            weakAreas: 1,
            createdAt: 1,
            updatedAt: 1,
            'user._id': 1,
            'user.email': 1,
            'user.isActive': 1,
            sessions: 1,
          },
        },
      ]);

      if (!result.length) {
        throw new NotFoundException('Student not found');
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error while fetching student');
    }
  }

  async updateStudent(
    studentId: string,
    dto: UpdateStudentDto,
    tutorId: string,
  ) {
    try {
      await this.validateTutor(tutorId);

      const existing = await this.genericFindOne({
        _id: studentId,
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      });

      if (!existing) {
        throw new NotFoundException('Student not found');
      }

      // Update user email if provided
      if (dto.email) {
        await this.userModel.findByIdAndUpdate(existing.userId, {
          email: dto.email.toLowerCase(),
        });
      }

      // Update student profile
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.subject) updateData.subject = dto.subject;
      if (dto.currentLevel) updateData.currentLevel = dto.currentLevel;
      if (dto.learningGoals) updateData.learningGoals = dto.learningGoals;
      if (dto.weakAreas) updateData.weakAreas = dto.weakAreas;

      const student = await this.genericUpdateOne(studentId, updateData);

      return {
        success: true,
        message: 'Student updated successfully',
        data: student,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to update student');
    }
  }

  async deleteStudent(studentId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);

      const existing = await this.genericFindOne({
        _id: studentId,
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      });

      if (!existing) {
        throw new NotFoundException('Student not found');
      }

      // Delete student profile
      const student = await this.genericDeleteOne(studentId);

      // Soft delete user account
      await this.userModel.findByIdAndUpdate(existing.userId, {
        isDeleted: true,
        isActive: false,
      });

      return {
        success: true,
        message: 'Student deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to delete student');
    }
  }

  async validateTutor(tutorId: string): Promise<UserDocument> {
    const tutor = await this.userModel.findOne({
      _id: tutorId,
      role: Role.TUTOR,
      isActive: true,
      isDeleted: false,
    });

    if (!tutor) {
      throw new BadRequestException('Tutor not found or inactive');
    }

    return tutor;
  }

  async validateStudentOwnership(
    studentId: string,
    tutorId: string,
  ): Promise<StudentDocument> {
    const student = await this.genericFindOne({
      _id: studentId,
      tutorId: new Types.ObjectId(tutorId),
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getStudentByUserId(userId: string): Promise<StudentDocument> {
    const student = await this.genericFindOne({
      userId: new Types.ObjectId(userId),
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return student;
  }

  async getStudentProfile(userId: string): Promise<StudentDocument> {
    const student = await this.model.findOne({
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  async getDashboard(userId: string) {
    const student = await this.getStudentProfile(userId);
    const studentId = student._id;
    const now = new Date();

    const upcoming = await this.sessionModel
      .find({
        studentId: studentId,
        isDeleted: false,
        status: { $in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
        scheduledAt: { $gte: now },
      })
      .sort({ scheduledAt: 1 })
      .lean();

    const completed = await this.sessionModel
      .find({
        studentId: studentId,
        isDeleted: false,
        status: { $in: [SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED] },
      })
      .sort({ scheduledAt: -1 })
      .limit(10)
      .lean();

    const homework = completed
      .filter(
        (s) => s.status === SessionStatus.AI_REVIEWED && s.aiDebrief?.homework,
      )
      .slice(0, 5)
      .map((s) => ({
        sessionId: s._id,
        topic: s.topic,
        homework: s.aiDebrief.homework,
      }));

    return {
      success: true,
      data: {
        student: {
          name: student.name,
          subject: student.subject,
          currentLevel: student.currentLevel,
        },
        upcoming: upcoming.map((s) => ({
          _id: s._id,
          topic: s.topic,
          scheduledAt: s.scheduledAt,
          status: s.status,
        })),
        completed: completed.map((s) => ({
          _id: s._id,
          topic: s.topic,
          scheduledAt: s.scheduledAt,
          status: s.status,
          notes: s.notes,
          aiDebrief: s.aiDebrief,
        })),
        homework,
      },
    };
  }

  async getSessions(userId: string) {
    const student = await this.getStudentProfile(userId);
    const sessions = await this.sessionModel
      .find({
        studentId: student._id,
        isDeleted: false,
      })
      .sort({ scheduledAt: -1 })
      .lean();

    return {
      success: true,
      data: sessions.map((s) => ({
        _id: s._id,
        topic: s.topic,
        scheduledAt: s.scheduledAt,
        status: s.status,
        notes: s.notes,
        aiDebrief: s.aiDebrief,
      })),
    };
  }

  async getSession(sessionId: string, userId: string) {
    const student = await this.getStudentProfile(userId);
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      studentId: student._id,
      isDeleted: false,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      success: true,
      data: {
        _id: session._id,
        topic: session.topic,
        scheduledAt: session.scheduledAt,
        status: session.status,
        notes: session.notes,
        aiPlan: session.aiPlan,
        aiDebrief: session.aiDebrief,
        completedAt: session.completedAt,
        aiReviewedAt: session.aiReviewedAt,
      },
    };
  }

  async getStudentDashboard(studentId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const student = await this.validateStudentOwnership(studentId, tutorId);

      const sessions = await this.sessionModel
        .find({
          studentId: new Types.ObjectId(studentId),
          tutorId: new Types.ObjectId(tutorId),
          isDeleted: false,
        })
        .sort({ scheduledAt: -1 })
        .lean()
        .exec();

      const upcoming = sessions.filter(
        (s) =>
          s.status === SessionStatus.SCHEDULED ||
          s.status === SessionStatus.IN_PROGRESS,
      );

      const completed = sessions.filter(
        (s) =>
          s.status === SessionStatus.COMPLETED ||
          s.status === SessionStatus.AI_REVIEWED,
      );

      const nextSession =
        upcoming.length > 0
          ? upcoming.sort(
              (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
            )[0]
          : null;

      const latestSession = sessions.length > 0 ? sessions[0] : null;

      const totalSessions = sessions.length;
      const completedCount = completed.length;
      const aiReviewedCount = sessions.filter(
        (s) => s.status === SessionStatus.AI_REVIEWED,
      ).length;

      return {
        success: true,
        data: {
          student: {
            _id: student._id,
            name: student.name,
            subject: student.subject,
            currentLevel: student.currentLevel,
            learningGoals: student.learningGoals,
            weakAreas: student.weakAreas,
          },
          stats: {
            totalSessions,
            completedCount,
            aiReviewedCount,
            upcomingCount: upcoming.length,
          },
          nextSession: nextSession
            ? {
                _id: nextSession._id,
                topic: nextSession.topic,
                scheduledAt: nextSession.scheduledAt,
                status: nextSession.status,
              }
            : null,
          latestSession: latestSession
            ? {
                _id: latestSession._id,
                topic: latestSession.topic,
                scheduledAt: latestSession.scheduledAt,
                status: latestSession.status,
              }
            : null,
          timeline: sessions.map((session) => ({
            _id: session._id,
            topic: session.topic,
            scheduledAt: session.scheduledAt,
            status: session.status,
            notes: session.notes,
            aiPlan: session.aiPlan,
            aiDebrief: session.aiDebrief,
            completedAt: session.completedAt,
            aiReviewedAt: session.aiReviewedAt,
          })),
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error fetching student dashboard');
    }
  }
}
