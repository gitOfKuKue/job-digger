import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleStrategy } from './google.strategy';
import { SessionSerializer } from './session.serializer';

@Module({
  imports: [PassportModule.register({ session: true })],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, SessionSerializer, GoogleAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
