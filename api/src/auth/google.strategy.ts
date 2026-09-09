import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly callbackURL: string;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    const callbackURL =
      config.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:8080/auth/google/callback';
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL,
      proxy: false,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
    this.callbackURL = callbackURL;
    this.logger.log(`Google redirect_uri: ${callbackURL}`);
  }

  authenticate(req: any, options?: Record<string, unknown>) {
    super.authenticate(req, {
      ...options,
      callbackURL: this.callbackURL,
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    return this.authService.upsertGoogleUser(
      profile,
      accessToken,
      refreshToken,
    );
  }
}
