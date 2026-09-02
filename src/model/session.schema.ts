import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { SessionStatus } from 'src/common/enum/session-status.enum';
import { BaseSchema } from './common/base.schema';
import { UserSchemaName } from './user.schema';
import { StudentSchemaName } from './student.schema';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session extends BaseSchema {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UserSchemaName,
    required: true,
    index: true,
  })
  tutorId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: StudentSchemaName,
    required: true,
    index: true,
  })
  studentId: Types.ObjectId;

  @Prop({
    required: true,
  })
  scheduledAt: Date;

  @Prop({
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200,
  })
  topic: string;

  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
    index: true,
  })
  status: SessionStatus;

  @Prop({
    type: String,
    default: '',
  })
  notes: string;

  @Prop({
    type: Object,
    default: null,
  })
  aiPlan: {
    learningObjectives: string[];
    lessonOutline: { title: string; description: string }[];
    practiceQuestions: string[];
  };

  @Prop({
    type: Object,
    default: null,
  })
  aiDebrief: {
    summary: string;
    homework: string[];
    nextFocus: string;
  };

  @Prop({
    default: null,
  })
  completedAt: Date;

  @Prop({
    default: null,
  })
  aiReviewedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
export const SessionSchemaName = Session.name;

SessionSchema.index({ tutorId: 1, scheduledAt: 1 });
SessionSchema.index({ studentId: 1, scheduledAt: 1 });
SessionSchema.index({ tutorId: 1, status: 1 });
SessionSchema.index({ studentId: 1, status: 1 });
SessionSchema.index({ tutorId: 1, isDeleted: 1 });