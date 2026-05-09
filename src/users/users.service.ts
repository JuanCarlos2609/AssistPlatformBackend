import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ApiResponse } from '../common/interfaces/api-response.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { User } from './entities/user.entity';

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  email: 'El correo electrónico personal ya está registrado.',
  curp: 'La CURP ingresada ya está registrada.',
  rfc: 'El RFC ingresado ya está registrado.',
  email_work: 'El correo electrónico de trabajo ya está registrado.',
};

function resolveUniqueViolationMessage(detail: string): string {
  for (const [field, message] of Object.entries(UNIQUE_FIELD_MESSAGES)) {
    if (detail.includes(`(${field})`)) return message;
  }
  return 'Uno de los datos ingresados ya existe en el sistema.';
}

@Injectable()
export class UsersService {
  private pendingRegistro: { userId: number } | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  setPendingRegistro(userId: number): void {
    this.pendingRegistro = { userId };
  }

  clearPendingRegistro(): void {
    this.pendingRegistro = null;
  }

  getStatusRegistro(): { pending: boolean; userId?: number } {
    if (this.pendingRegistro) {
      return { pending: true, userId: this.pendingRegistro.userId };
    }
    return { pending: false };
  }

  async findAll(dto: GetUsersDto): Promise<
    ApiResponse<{
      users: User[];
      total: number;
      page: number;
      itemsPerPage: number;
    }>
  > {
    const { page = 1, itemsPerPage = 10, search } = dto;
    const skip = (Number(page) - 1) * Number(itemsPerPage);

    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.last_name',
        'user.middle_name',
        'user.curp',
        'user.rfc',
        'user.email',
        'user.phone',
        'user.department',
        'user.position',
        'user.email_work',
        'user.privacy_notice',
        'user.biometric_id',
        'user.nss',
        'user.role',
        'user.created_at',
        'user.updated_at',
      ]);

    if (search?.trim()) {
      query.where(
        'user.name ILIKE :search OR user.last_name ILIKE :search OR user.email_work ILIKE :search',
        { search: `%${search.trim()}%` },
      );
    }

    const [users, total] = await query
      .skip(skip)
      .take(Number(itemsPerPage))
      .getManyAndCount();

    return {
      code: 200,
      message: 'ok',
      data: {
        users,
        total,
        page: Number(page),
        itemsPerPage: Number(itemsPerPage),
      },
    };
  }

  async create(
    dto: CreateUserDto,
  ): Promise<ApiResponse<{ id: number; user: Omit<User, 'password_hash'> }>> {
    const { password, nss, ...rest } = dto;

    const password_hash = await bcrypt.hash(password, 10);

    // Obtener los valores permitidos del constraint para usar el casing correcto
    const rows: { def: string }[] = await this.userRepository.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'`,
    );
    const constraintDef: string = rows[0]?.def ?? '';
    const allowed: string[] = (constraintDef.match(/'([^']+)'/g) ?? []).map(
      (v: string) => v.replace(/'/g, ''),
    );

    const rawRole = (rest.role ?? 'User').toLowerCase();
    const dbRole =
      allowed.find((v) => v.toLowerCase() === rawRole) ??
      (rawRole === 'admin' ? 'Admin' : 'User');

    const newUser = this.userRepository.create({
      ...rest,
      nss: nss === undefined || nss === null ? null : String(nss),
      biometric_id: rest.biometric_id ?? null,
      role: dbRole as 'Admin' | 'User',
      password_hash,
    });

    try {
      const saved = await this.userRepository.save(newUser);

      // password_hash tiene select:false, pero save() lo retorna en memoria; lo removemos antes de responder.
      const { password_hash: _removed, ...userWithoutPassword } =
        saved as unknown as User & { password_hash: string };

      return {
        code: 200,
        message: 'ok',
        data: {
          id: (saved as unknown as User).id,
          user: userWithoutPassword as Omit<User, 'password_hash'>,
        },
      };
    } catch (err: any) {
      // Código 23505 = violación de restricción UNIQUE en PostgreSQL
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 409,
          message: resolveUniqueViolationMessage(err.detail ?? ''),
          data: null,
        });
      }
      throw err;
    }
  }

  async update(
    id: number,
    fields: Partial<Pick<User, 'biometric_id'>>,
  ): Promise<ApiResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        code: 404,
        message: `No se encontró el usuario con id ${id}.`,
        data: null,
      });
    }

    this.clearPendingRegistro();

    await this.userRepository.update(id, fields);

    const updated = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.last_name',
        'user.middle_name',
        'user.curp',
        'user.rfc',
        'user.email',
        'user.phone',
        'user.department',
        'user.position',
        'user.email_work',
        'user.privacy_notice',
        'user.biometric_id',
        'user.nss',
        'user.role',
        'user.created_at',
        'user.updated_at',
      ])
      .where('user.id = :id', { id })
      .getOne();

    return {
      code: 200,
      message: 'ok',
      data: updated,
    };
  }
}
