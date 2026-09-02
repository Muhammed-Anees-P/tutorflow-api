import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { AiModule } from 'src/ai/ai.module';
import { StudentSchema, StudentSchemaName } from 'src/model/student.schema';
import { SessionSchema, SessionSchemaName } from 'src/model/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentSchemaName, schema: StudentSchema },
      { name: SessionSchemaName, schema: SessionSchema },
    ]),
    AiModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}