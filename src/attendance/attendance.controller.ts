import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanBiometric(@Body('biometric_id') biometricId: number) {
    return this.attendanceService.processScan(biometricId);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getAttendanceByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.attendanceService.getAttendanceByUser(userId);
  }
}
