import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('scan')
    @HttpCode(HttpStatus.OK)
    async scanBiometric(@Body('biometric_id') biometricId: number) {
        // Delegamos toda la lógica de negocio al servicio
        return this.attendanceService.processScan(biometricId);
    }
}