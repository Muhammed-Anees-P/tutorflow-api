import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Role } from 'src/common/enum/role.enum';
import { BaseSchema } from './common/base.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends BaseSchema {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  })
  username: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  })
  firstName: string;

  @Prop({
    trim: true,
    maxlength: 50,
    default: null,
  })
  lastName?: string;

  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    maxlength: 150,
    default: null,
  })
  email?: string;

  @Prop({
    trim: true,
    maxlength: 20,
    default: null,
  })
  phone?: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    type: String,
    enum: Role,
    required: true,
    default: Role.STUDENT,
    index: true,
  })
  role: Role;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const UserSchemaName = User.name;
