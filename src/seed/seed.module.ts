import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { UserSchema, UserSchemaName } from 'src/model/user.schema';
import { StudentSchema, StudentSchemaName } from 'src/model/student.schema';
import { SessionSchema, SessionSchemaName } from 'src/model/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaName, schema: UserSchema },
      { name: StudentSchemaName, schema: StudentSchema },
      { name: SessionSchemaName, schema: SessionSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
