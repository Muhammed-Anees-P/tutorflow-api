import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enum/role.enum';
import { SessionStatus } from '../common/enum/session-status.enum';
import { UserDocument, UserSchemaName } from 'src/model/user.schema';
import { StudentDocument, StudentSchemaName } from 'src/model/student.schema';
import { SessionDocument, SessionSchemaName } from 'src/model/session.schema';
import { seedData } from './data/seed.data';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectModel(UserSchemaName)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(StudentSchemaName)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(SessionSchemaName)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed(): Promise<{
    success: boolean;
    message: string;
    data?: {
      tutor: UserDocument;
      student: StudentDocument | null;
      sessions: SessionDocument[];
    };
  }> {
    try {
      // Check if tutor already exists
      const existingTutor = await this.userModel.findOne({
        username: seedData.tutor.username,
        isDeleted: false,
      });

      if (existingTutor) {
        return {
          success: true,
          message: 'Database already seeded',
          data: {
            tutor: existingTutor,
            student: await this.studentModel.findOne({
              tutorId: existingTutor._id,
              isDeleted: false,
            }),
            sessions: await this.sessionModel.find({
              tutorId: existingTutor._id,
              isDeleted: false,
            }),
          },
        };
      }

      const tutor = await this.createTutor();

      const student = await this.createStudent(tutor._id);

      const sessions = await this.createSessions(tutor._id, student._id);

      return {
        success: true,
        message: 'Database seeded successfully',
        data: {
          tutor,
          student,
          sessions,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error while seed data');
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to seed database',
      };
    }
  }

  private async createTutor(): Promise<UserDocument> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(seedData.tutor.password, salt);

    const tutor = new this.userModel({
      username: seedData.tutor.username,
      firstName: seedData.tutor.firstName,
      lastName: seedData.tutor.lastName,
      email: seedData.tutor.email,
      password: hashedPassword,
      role: Role.TUTOR,
      isActive: seedData.tutor.isActive,
      isDeleted: false,
    });

    await tutor.save();
    return tutor;
  }

  private async createStudent(
    tutorId: Types.ObjectId,
  ): Promise<StudentDocument> {
    const studentData = seedData.student;

    let studentUser = await this.userModel.findOne({
      email: studentData.email,
      isDeleted: false,
    });

    if (!studentUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(studentData.password, salt);

      studentUser = await this.userModel.create({
        username: studentData.email.split('@')[0] + '_' + Date.now(),
        firstName: studentData.name.split(' ')[0],
        lastName: studentData.name.split(' ').slice(1).join(' '),
        email: studentData.email,
        password: hashedPassword,
        role: Role.STUDENT,
        isActive: true,
        isDeleted: false,
        createdBy: tutorId,
      });
    }

    // Create student profile
    let student = await this.studentModel.findOne({
      userId: studentUser._id,
      isDeleted: false,
    });

    if (!student) {
      student = await this.studentModel.create({
        tutorId: tutorId,
        userId: studentUser._id,
        name: studentData.name,
        subject: studentData.subject,
        currentLevel: studentData.currentLevel,
        learningGoals: studentData.learningGoals,
        weakAreas: studentData.weakAreas,
        createdBy: tutorId,
        isDeleted: false,
      });
    }

    return student;
  }

  private async createSessions(
    tutorId: Types.ObjectId,
    studentId: Types.ObjectId,
  ): Promise<SessionDocument[]> {
    const createdSessions: SessionDocument[] = [];

    for (const sessionData of seedData.sessions) {
      let session = await this.sessionModel.findOne({
        tutorId: tutorId,
        studentId: studentId,
        topic: sessionData.topic,
        isDeleted: false,
      });

      if (!session) {
        const sessionPayload: any = {
          tutorId: tutorId,
          studentId: studentId,
          scheduledAt: sessionData.scheduledAt,
          topic: sessionData.topic,
          status: sessionData.status || SessionStatus.SCHEDULED,
          notes: sessionData.notes || '',
          createdBy: tutorId,
          isDeleted: false,
        };

        if (sessionData.aiPlan) {
          sessionPayload.aiPlan = sessionData.aiPlan;
        }

        if (sessionData.aiDebrief) {
          sessionPayload.aiDebrief = sessionData.aiDebrief;
        }

        if (
          sessionData.status === SessionStatus.COMPLETED ||
          sessionData.status === SessionStatus.AI_REVIEWED
        ) {
          sessionPayload.completedAt = new Date(
            sessionData.scheduledAt.getTime() + 60 * 60 * 1000,
          );
        }

        // Set aiReviewedAt if status is AI_REVIEWED
        if (sessionData.status === SessionStatus.AI_REVIEWED) {
          sessionPayload.aiReviewedAt = new Date(
            sessionData.scheduledAt.getTime() + 65 * 60 * 1000,
          );
        }

        session = await this.sessionModel.create(sessionPayload);
      }

      createdSessions.push(session);
    }

    return createdSessions;
  }
}
