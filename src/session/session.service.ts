import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { Role } from 'src/common/enum/role.enum';
import { AiService } from 'src/ai/ai.service';
import { GenericDatabase } from 'src/helpers/genericDatabase';
import { SessionDocument, SessionSchemaName } from 'src/model/session.schema';
import { StudentDocument, StudentSchemaName } from 'src/model/student.schema';
import { UserDocument, UserSchemaName } from 'src/model/user.schema';
import { UpdateSessionDto } from './dto/update-session.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class SessionsService extends GenericDatabase<Model<SessionDocument>> {
  private readonly SESSION_DURATION_MINUTES = 60;

  constructor(
    @InjectModel(SessionSchemaName)
    private readonly model: Model<SessionDocument>,
    @InjectModel(StudentSchemaName)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(UserSchemaName)
    private readonly userModel: Model<UserDocument>,
    private readonly aiService: AiService,
    private readonly mailService: MailService,
  ) {
    super(model);
  }

  // ==================== Core CRUD ====================

  async createSession(dto: CreateSessionDto, tutorId: string) {
    try {
      await this.validateTutor(tutorId);

      const student = await this.studentModel.findOne({
        _id: dto.studentId,
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      });
      if (!student) {
        throw new NotFoundException(
          'Student not found or does not belong to you',
        );
      }

      const scheduledAt = new Date(dto.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid date');
      }

      await this.checkForConflicts(tutorId, scheduledAt);

      const session = await this.genericCreateOne({
        tutorId: new Types.ObjectId(tutorId),
        studentId: new Types.ObjectId(dto.studentId),
        scheduledAt,
        topic: dto.topic,
        status: SessionStatus.SCHEDULED,
        createdBy: new Types.ObjectId(tutorId),
      });

      // Email notification must never prevent a successfully scheduled session
      // from being returned to the tutor.
      try {
        const studentUser = await this.userModel.findOne({
          _id: student.userId,
          role: Role.STUDENT,
          isDeleted: false,
        });

        if (studentUser?.email) {
          const tutor = await this.userModel.findOne({
            _id: new Types.ObjectId(tutorId),
            role: Role.TUTOR,
            isDeleted: false,
          });

          await this.mailService.sendSessionScheduledEmail({
            to: studentUser.email,
            studentName: student.name,
            tutorName:
              [tutor?.firstName, tutor?.lastName].filter(Boolean).join(' ') ||
              'Your tutor',
            topic: dto.topic,
            scheduledAt,
          });
        } else {
          console.warn(
            `Session ${session._id}: student does not have an email address.`,
          );
        }
      } catch (emailError: unknown) {
        console.error(
          `Session ${session._id}: failed to send scheduling email.`,
          emailError,
        );
      }

      return {
        success: true,
        message: 'Session created successfully',
        data: session,
        statusCode: HttpStatus.CREATED,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'ConflictException') {
          throw error;
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create session');
    }
  }

  private async checkForConflicts(
    tutorId: string,
    scheduledAt: Date,
  ): Promise<void> {
    const start = new Date(scheduledAt);
    const end = new Date(
      start.getTime() + this.SESSION_DURATION_MINUTES * 60 * 1000,
    );

    const conflict = await this.model.findOne({
      tutorId: new Types.ObjectId(tutorId),
      isDeleted: false,
      status: { $ne: SessionStatus.AI_REVIEWED },
      $or: [
        {
          scheduledAt: { $lt: end },
          $expr: {
            $gt: [
              {
                $add: [
                  '$scheduledAt',
                  this.SESSION_DURATION_MINUTES * 60 * 1000,
                ],
              },
              start,
            ],
          },
        },
      ],
    });

    if (conflict) {
      throw new ConflictException(
        'Tutor already has a session scheduled during this time.',
      );
    }
  }

  async findAllSessions(
    tutorId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    try {
      await this.validateTutor(tutorId);
      const match: any = {
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      };
      if (status) match.status = status;

      const skip = (page - 1) * limit;
      const result = await this.model.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            topic: 1,
            scheduledAt: 1,
            status: 1,
            notes: 1,
            aiPlan: 1,
            aiDebrief: 1,
            completedAt: 1,
            aiReviewedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            'student._id': 1,
            'student.name': 1,
            'student.subject': 1,
          },
        },
        { $sort: { scheduledAt: -1 } },
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
      throw new BadRequestException('Error while fetching sessions');
    }
  }

  async findOneSession(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);

      const result = await this.model.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(sessionId),
            tutorId: new Types.ObjectId(tutorId),
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            topic: 1,
            scheduledAt: 1,
            status: 1,
            notes: 1,
            aiPlan: 1,
            aiDebrief: 1,
            completedAt: 1,
            aiReviewedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            'student._id': 1,
            'student.name': 1,
            'student.subject': 1,
            'student.currentLevel': 1,
            'student.learningGoals': 1,
            'student.weakAreas': 1,
          },
        },
      ]);

      if (!result.length) {
        throw new NotFoundException('Session not found');
      }
      return { success: true, data: result[0] };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Error while fetching session');
    }
  }

  // ==================== Lifecycle Transitions ====================

  async startSession(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (session.status !== SessionStatus.SCHEDULED) {
        throw new ConflictException('Session must be SCHEDULED to start.');
      }

      session.status = SessionStatus.IN_PROGRESS;
      await session.save();

      return {
        success: true,
        message: 'Session started successfully',
        data: session,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to start session');
    }
  }

  async completeSession(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (session.status !== SessionStatus.IN_PROGRESS) {
        throw new ConflictException('Session must be IN_PROGRESS to complete.');
      }

      session.status = SessionStatus.COMPLETED;
      session.completedAt = new Date();
      await session.save();

      return {
        success: true,
        message: 'Session completed successfully',
        data: session,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to complete session');
    }
  }

  // ==================== Notes (with ownership and status check) ====================

  async updateNotes(sessionId: string, notes: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (session.status !== SessionStatus.IN_PROGRESS) {
        throw new ConflictException(
          'Notes can only be edited when session is IN_PROGRESS.',
        );
      }

      session.notes = notes || '';
      await session.save();

      return {
        success: true,
        message: 'Notes updated successfully',
        data: {
          notes: session.notes,
          // updatedAt: session.updatedAt,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to update notes');
    }
  }

  // ==================== AI Plan ====================

  async generateAiPlan(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (
        session.status === SessionStatus.COMPLETED ||
        session.status === SessionStatus.AI_REVIEWED
      ) {
        throw new ConflictException(
          'AI plan cannot be generated for completed sessions.',
        );
      }

      const student = await this.studentModel.findOne({
        _id: session.studentId,
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const pastSessions = await this.model
        .find({
          studentId: session.studentId,
          status: { $in: [SessionStatus.COMPLETED, SessionStatus.AI_REVIEWED] },
          isDeleted: false,
        })
        .sort({ scheduledAt: -1 })
        .limit(5)
        .lean();

      const aiPlan = await this.aiService.generateSessionPlan({
        student: {
          name: student.name,
          subject: student.subject,
          currentLevel: student.currentLevel,
          learningGoals: student.learningGoals,
          weakAreas: student.weakAreas,
        },
        topic: session.topic,
        pastSessions: pastSessions.map((s) => ({
          topic: s.topic,
          notes: s.notes,
          aiDebrief: s.aiDebrief,
          scheduledAt: s.scheduledAt,
        })),
      });

      session.aiPlan = aiPlan;
      await session.save();

      return {
        success: true,
        message: 'AI plan generated successfully',
        data: session.aiPlan,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  // ==================== AI Debrief ====================

  async generateAiDebrief(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (session.status !== SessionStatus.COMPLETED) {
        throw new ConflictException(
          'AI debrief can only be generated for COMPLETED sessions.',
        );
      }

      const student = await this.studentModel.findOne({
        _id: session.studentId,
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const pastSessions = await this.model
        .find({
          studentId: session.studentId,
          status: SessionStatus.AI_REVIEWED,
          isDeleted: false,
          _id: { $ne: sessionId },
        })
        .sort({ scheduledAt: -1 })
        .limit(5)
        .lean();

      const aiDebrief = await this.aiService.generateDebrief({
        student: {
          name: student.name,
          subject: student.subject,
          currentLevel: student.currentLevel,
          learningGoals: student.learningGoals,
          weakAreas: student.weakAreas,
        },
        topic: session.topic,
        notes: session.notes,
        pastSessions: pastSessions.map((s) => ({
          topic: s.topic,
          aiDebrief: s.aiDebrief,
          scheduledAt: s.scheduledAt,
        })),
      });

      session.aiDebrief = aiDebrief;
      session.status = SessionStatus.AI_REVIEWED;
      session.aiReviewedAt = new Date();
      await session.save();

      return {
        success: true,
        message: 'AI debrief generated successfully',
        data: session.aiDebrief,
        status: session.status,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  // ==================== Helpers ====================

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

  async validateSessionOwnership(
    sessionId: string,
    tutorId: string,
  ): Promise<SessionDocument> {
    const session = await this.genericFindOne({
      _id: sessionId,
      tutorId: new Types.ObjectId(tutorId),
      isDeleted: false,
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async getSessionsForStudent(
    studentId: string,
    tutorId: string,
  ): Promise<SessionDocument[]> {
    return this.model
      .find({
        studentId: new Types.ObjectId(studentId),
        tutorId: new Types.ObjectId(tutorId),
        isDeleted: false,
      })
      .sort({ scheduledAt: -1 })
      .lean();
  }

  async getStudentSessions(studentId: string): Promise<SessionDocument[]> {
    return this.model
      .find({
        studentId: new Types.ObjectId(studentId),
        isDeleted: false,
      })
      .sort({ scheduledAt: -1 })
      .lean();
  }

  async updateSession(
    sessionId: string,
    dto: UpdateSessionDto,
    tutorId: string,
  ) {
    try {
      await this.validateTutor(tutorId);
      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (
        session.status === SessionStatus.COMPLETED ||
        session.status === SessionStatus.AI_REVIEWED
      ) {
        throw new ConflictException(
          'Completed sessions are read-only and cannot be updated.',
        );
      }

      if (dto.studentId && dto.studentId !== session.studentId.toString()) {
        const newStudent = await this.studentModel.findOne({
          _id: dto.studentId,
          tutorId: new Types.ObjectId(tutorId),
          isDeleted: false,
        });
        if (!newStudent) {
          throw new NotFoundException(
            'Student not found or does not belong to you',
          );
        }
        session.studentId = new Types.ObjectId(dto.studentId);
      }

      if (dto.scheduledAt) {
        // Cannot change time if session is already IN_PROGRESS
        if (session.status === SessionStatus.IN_PROGRESS) {
          throw new ConflictException(
            'Cannot change the time of an in-progress session. Only the topic can be updated.',
          );
        }

        const newDate = new Date(dto.scheduledAt);
        if (isNaN(newDate.getTime())) {
          throw new BadRequestException('Invalid date');
        }

        // Cannot schedule in the past
        if (newDate < new Date()) {
          throw new BadRequestException(
            'Cannot schedule a session in the past.',
          );
        }

        // Check for conflicts (excluding current session)
        await this.checkForConflictsOnUpdate(tutorId, newDate, sessionId);

        session.scheduledAt = newDate;
      }

      // 4. Update Topic
      if (dto.topic) {
        session.topic = dto.topic;
      }

      await session.save();

      return {
        success: true,
        message: 'Session updated successfully',
        data: session,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          error.name === 'ConflictException' ||
          error.name === 'NotFoundException' ||
          error.name === 'BadRequestException'
        ) {
          throw error;
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to update session');
    }
  }

  // ==================== Delete Session ====================

  async deleteSession(sessionId: string, tutorId: string) {
    try {
      await this.validateTutor(tutorId);

      const session = await this.validateSessionOwnership(sessionId, tutorId);

      if (session.status !== SessionStatus.SCHEDULED) {
        throw new ConflictException('Only scheduled sessions can be deleted.');
      }

      session.isDeleted = true;

      await session.save();

      return {
        success: true,
        message: 'Session deleted successfully',
        data: {
          _id: session._id,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          error.name === 'ConflictException' ||
          error.name === 'NotFoundException' ||
          error.name === 'BadRequestException'
        ) {
          throw error;
        }

        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Failed to delete session');
    }
  }

  // Helper to check for conflicts, excluding the current session
  private async checkForConflictsOnUpdate(
    tutorId: string,
    scheduledAt: Date,
    excludeSessionId: string,
  ): Promise<void> {
    const start = new Date(scheduledAt);
    const end = new Date(
      start.getTime() + this.SESSION_DURATION_MINUTES * 60 * 1000,
    );

    const conflict = await this.model.findOne({
      tutorId: new Types.ObjectId(tutorId),
      isDeleted: false,
      status: { $ne: SessionStatus.AI_REVIEWED },
      _id: { $ne: new Types.ObjectId(excludeSessionId) },
      $or: [
        {
          scheduledAt: { $lt: end },
          $expr: {
            $gt: [
              {
                $add: [
                  '$scheduledAt',
                  this.SESSION_DURATION_MINUTES * 60 * 1000,
                ],
              },
              start,
            ],
          },
        },
      ],
    });

    if (conflict) {
      throw new ConflictException(
        'Tutor already has a session scheduled during this time.',
      );
    }
  }
}
