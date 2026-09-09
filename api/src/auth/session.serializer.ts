import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  serializeUser(user: Express.User, done: (err: Error | null, id: string) => void) {
    done(null, user.id);
  }

  async deserializeUser(
    id: string,
    done: (err: Error | null, user: Express.User | null) => void,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        done(null, null);
        return;
      }
      done(null, { id: user.id, email: user.email, name: user.name });
    } catch (error) {
      done(error as Error, null);
    }
  }
}
