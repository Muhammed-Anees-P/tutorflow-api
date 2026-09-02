import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentSchema, StudentSchemaName } from 'src/model/student.schema';
import { StudentsController } from './student.controller';
import { StudentsService } from './student.service';
import { UserSchema, UserSchemaName } from 'src/model/user.schema';
import { SessionSchema, SessionSchemaName } from 'src/model/session.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentSchemaName, schema: StudentSchema },
      { name: UserSchemaName, schema: UserSchema },
      { name: SessionSchemaName, schema: SessionSchema },
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
