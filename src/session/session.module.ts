import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from 'src/ai/ai.module';
import { SessionSchema, SessionSchemaName } from 'src/model/session.schema';
import { StudentSchema, StudentSchemaName } from 'src/model/student.schema';
import { UserSchema, UserSchemaName } from 'src/model/user.schema';
import { SessionsController } from './session.controller';
import { SessionsService } from './session.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionSchemaName, schema: SessionSchema },
      { name: StudentSchemaName, schema: StudentSchema },
      { name: UserSchemaName, schema: UserSchema },
    ]),
    AiModule,
    MailModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
