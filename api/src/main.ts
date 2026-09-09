import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: frontend,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.use(
    session({
      name: 'jobdigger.sid',
      secret: process.env.SESSION_SECRET || 'job-digger-dev-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(process.env.PORT ?? 8080);
  const callback =
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:8080/auth/google/callback';
  console.log(`API listening on ${await app.getUrl()}`);
  console.log(`Google redirect_uri (must match OAuth client exactly): ${callback}`);
}

bootstrap();
