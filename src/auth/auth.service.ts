import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'Admin' | 'User';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{
    token: string;
    user: { id: number; name: string; email: string; role: 'Admin' | 'User' };
  }> {
    // Busca por email personal o email de trabajo
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.email_work',
        'user.role',
        'user.password_hash',
      ])
      .where('user.email = :email OR user.email_work = :email', {
        email: dto.email.toLowerCase().trim(),
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // password_hash tiene select:false en la entidad; el QueryBuilder con addSelect lo trae explícitamente
    const hash = (user as unknown as User & { password_hash: string })
      .password_hash;

    const passwordMatch = hash ? await bcrypt.compare(dto.password, hash) : false;

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // Normalizar el rol a capitalizado para que el frontend reciba siempre 'Admin' o 'User'
    const rawRole = (user.role ?? 'user').toLowerCase();
    const normalizedRole: 'Admin' | 'User' = rawRole === 'admin' ? 'Admin' : 'User';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? user.email_work,
      role: normalizedRole,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? user.email_work,
        role: normalizedRole,
      },
    };
  }
}
