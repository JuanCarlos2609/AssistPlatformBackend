// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { UsersModule } from './users/users.module';
// import { AttendanceModule } from './attendance/attendance.module';
// import { AuthModule } from './auth/auth.module';

// @Module({
//   imports: [
//     TypeOrmModule.forRoot({
//       type: 'postgres',
//       host: 'localhost',
//       port: 5433,
//       username: 'postgres',
//       password: 'jCharlie2609$',
//       database: 'AssistPlatformDB',
//       autoLoadEntities: true,
//       // La tabla users ya existe y puede tener NULLs; synchronize intentaría NOT NULL y falla.
//       // Usa migraciones para cambios de esquema en serio.
//       synchronize: false,
//     }),
//     UsersModule,
//     AttendanceModule,
//     AuthModule,
//   ],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- NUEVAS IMPORTACIONES
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 1. Cargamos las variables de entorno de forma global
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Usamos forRootAsync para esperar a que las variables carguen
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // TypeORM lee toda la cadena de conexión desde DATABASE_URL
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // Excelente práctica mantenerlo en false para producción
        // IMPORTANTE para Supabase: Requiere conexión segura (SSL)
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),

    UsersModule,
    AttendanceModule,
    AuthModule,
  ],
})
export class AppModule { }