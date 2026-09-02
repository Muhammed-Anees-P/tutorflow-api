import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from 'src/ai/ai.service';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { SessionDocument, SessionSchemaName } from 'src/model/session.schema';
import { StudentDocument, StudentSchemaName } from 'src/model/student.schema';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(StudentSchemaName)
    private studentModel: Model<StudentDocument>,
    @InjectModel(SessionSchemaName)
    private sessionModel: Model<SessionDocument>,
    private aiService: AiService,
  ) {}

  async generateProgressSummary(studentId: string, tutorId: string) {
    const student = await this.studentModel.findOne({
      _id: studentId,
      tutorId: new Types.ObjectId(tutorId),
      isDeleted: false,
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const sessions = await this.sessionModel.find({
      studentId: new Types.ObjectId(studentId),
      status: SessionStatus.AI_REVIEWED,
      isDeleted: false,
    })
    .sort({ scheduledAt: -1 })
    .lean();

    if (sessions.length === 0) {
      return {
        success: true,
        data: 'Not enough completed session history is available to generate a meaningful progress summary yet.',
      };
    }

    const pastDebriefs = sessions.map(s => ({
      summary: s.aiDebrief?.summary || '',
      homework: s.aiDebrief?.homework || [],
      nextFocus: s.aiDebrief?.nextFocus || '',
      topic: s.topic,
      scheduledAt: s.scheduledAt,
    }));

    const summary = await this.aiService.generateProgressSummary({
      student: {
        name: student.name,
        subject: student.subject,
        currentLevel: student.currentLevel,
        learningGoals: student.learningGoals,
        weakAreas: student.weakAreas,
      },
      pastDebriefs,
    });

    return {
      success: true,
      data: summary,
    };
  }
}