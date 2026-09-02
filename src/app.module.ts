import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AiModule } from './ai/ai.module';
import { ProgressModule } from './progress/progress.module';
import { StudentsModule } from './student/student.module';
import { SessionsModule } from './session/session.module';
import { MongooseModule } from '@nestjs/mongoose';
import { mongooseConnectionString } from './config/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SeedModule } from './seed/seed.module';
@Module({
  imports: [
    MongooseModule.forRoot(mongooseConnectionString),
    AuthModule,
    UserModule,
    StudentsModule,
    SessionsModule,
    AiModule,
    ProgressModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
