import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'jCharlie2609$',
      database: 'AssistPlatformDB',
      autoLoadEntities: true,
      // La tabla users ya existe y puede tener NULLs; synchronize intentaría NOT NULL y falla.
      // Usa migraciones para cambios de esquema en serio.
      synchronize: false,
    }),
    UsersModule,
    AttendanceModule,
    AuthModule,
  ],
})
export class AppModule {}
