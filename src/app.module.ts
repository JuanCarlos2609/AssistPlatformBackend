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
// export class AppModule { }

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
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