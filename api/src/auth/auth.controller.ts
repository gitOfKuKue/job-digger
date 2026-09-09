import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('oauth-config')
  oauthConfig() {
    return {
      redirectUri:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:8080/auth/google/callback',
      clientId: process.env.GOOGLE_CLIENT_ID || null,
    };
  }
  @Get('me')
  me(@Req() req: Request) {
    const user = req.user
      ? { id: req.user.id, email: req.user.email, name: req.user.name }
      : null;
    return {
      user,
      googleConfigured: this.authService.isGoogleConfigured(),
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectTo = `${frontend}/?connected=1`;
    if (!req.session) {
      return res.redirect(redirectTo);
    }
    req.session.save(() => {
      res.redirect(redirectTo);
    });
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to log out.' });
        return;
      }
      req.session?.destroy(() => {
        res.clearCookie('jobdigger.sid');
        res.json({ ok: true });
      });
    });
  }
}
