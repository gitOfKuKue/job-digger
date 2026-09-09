import {
  BadRequestException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly authService: AuthService) {
    super({ session: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.authService.isGoogleConfigured()) {
      throw new BadRequestException(
        'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to api/.env.',
      );
    }
    const result = await super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user) {
      await super.logIn(request);
    }
    return Boolean(result);
  }
}
