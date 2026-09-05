import { Injectable, OnModuleInit } from '@nestjs/common';
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
      tutors: UserDocument[];
      students: StudentDocument[];
      sessions: SessionDocument[];
    };
  }> {
    try {
      const tutorOne = await this.createTutor(seedData.tutor);
      const studentOne = await this.createStudent(
        seedData.student,
        tutorOne._id,
      );

      const tutorTwo = await this.createTutor(seedData.tutor_two);

      const studentTwo = await this.createStudent(
        seedData.student_two,
        tutorTwo._id,
      );

      const tutorOneSessions = seedData.sessions.slice(0, 4);

      const tutorTwoSessions = seedData.sessions.slice(4, 8);

      const sessionsOne = await this.createSessions(
        tutorOne._id,
        studentOne._id,
        tutorOneSessions,
      );

      const sessionsTwo = await this.createSessions(
        tutorTwo._id,
        studentTwo._id,
        tutorTwoSessions,
      );

      return {
        success: true,
        message: 'Database seeded successfully',
        data: {
          tutors: [tutorOne, tutorTwo],
          students: [studentOne, studentTwo],
          sessions: [...sessionsOne, ...sessionsTwo],
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

  private async createTutor(
    tutorData: typeof seedData.tutor | typeof seedData.tutor_two,
  ): Promise<UserDocument> {
    const email = tutorData.email.toLowerCase().trim();

    let tutor = await this.userModel.findOne({
      email,
      role: Role.TUTOR,
      isDeleted: false,
    });

    if (tutor) {
      return tutor;
    }

    tutor = await this.userModel.findOne({
      username: tutorData.username,
      role: Role.TUTOR,
      isDeleted: false,
    });

    if (tutor) {
      return tutor;
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(tutorData.password, salt);

    tutor = await this.userModel.create({
      username: tutorData.username,

      firstName: tutorData.firstName,

      lastName: tutorData.lastName,

      email,

      password: hashedPassword,

      role: Role.TUTOR,

      isActive: tutorData.isActive,

      isDeleted: false,
    });

    return tutor;
  }

  private async createStudent(
    studentData: typeof seedData.student | typeof seedData.student_two,
    tutorId: Types.ObjectId,
  ): Promise<StudentDocument> {
    const email = studentData.email.toLowerCase().trim();

    let studentUser = await this.userModel.findOne({
      email,
      role: Role.STUDENT,
      isDeleted: false,
    });

    if (!studentUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(studentData.password, salt);

      studentUser = await this.userModel.create({
        username: studentData.username,
        firstName: studentData.name.split(' ')[0],
        lastName: studentData.name.split(' ').slice(1).join(' '),
        email,
        password: hashedPassword,
        role: Role.STUDENT,
        isActive: true,
        isDeleted: false,
        createdBy: tutorId,
      });
    }

    // Find existing student profile
    let student = await this.studentModel.findOne({
      userId: studentUser._id,
      tutorId,
      isDeleted: false,
    });

    // Create student profile
    if (!student) {
      student = await this.studentModel.create({
        tutorId,

        userId: studentUser._id,

        name: studentData.name,

        subject: studentData.subject,

        currentLevel: studentData.currentLevel,

        learningGoals: studentData.learningGoals || [],

        weakAreas: studentData.weakAreas || [],

        createdBy: tutorId,

        isDeleted: false,
      });
    }

    return student;
  }

  private async createSessions(
    tutorId: Types.ObjectId,
    studentId: Types.ObjectId,
    sessionsData: typeof seedData.sessions,
  ): Promise<SessionDocument[]> {
    const createdSessions: SessionDocument[] = [];

    for (const sessionData of sessionsData) {
      let session = await this.sessionModel.findOne({
        tutorId,

        studentId,

        topic: sessionData.topic,

        isDeleted: false,
      });

      if (!session) {
        const sessionPayload: Record<string, any> = {
          tutorId,

          studentId,

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
