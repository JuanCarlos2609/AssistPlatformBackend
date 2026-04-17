// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { UsersModule } from './users/users.module';

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
//   ],
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // <-- Importar aquí
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- Carga el .env de forma segura antes que el resto
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    UsersModule,
  ],
})
export class AppModule { }