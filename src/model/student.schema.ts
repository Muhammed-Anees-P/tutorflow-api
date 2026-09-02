import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { BaseSchema } from './common/base.schema';
import { UserSchemaName } from './user.schema';

export type StudentDocument = Student & Document;

@Schema({ timestamps: true })
export class Student extends BaseSchema {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UserSchemaName,
    required: true,
  })
  tutorId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UserSchemaName,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  name: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  subject: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  })
  currentLevel: string;

  @Prop({
    type: [String],
    default: [],
  })
  learningGoals: string[];

  @Prop({
    type: [String],
    default: [],
  })
  weakAreas: string[];
}

export const StudentSchema = SchemaFactory.createForClass(Student);
export const StudentSchemaName = Student.name;

// StudentSchema.index({ userId: 1 });
// StudentSchema.index({ tutorId: 1, name: 1 });
// StudentSchema.index({ tutorId: 1, isDeleted: 1 });
