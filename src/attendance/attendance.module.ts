import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity'; // <-- NUEVO

@Module({
  imports: [TypeOrmModule.forFeature([User, Attendance]), UsersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule { }
