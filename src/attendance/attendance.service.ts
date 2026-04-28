import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ApiResponse } from '../common/interfaces/api-response.interface';
import { User } from '../users/entities/user.entity';
import { Attendance } from './entities/attendance.entity';
import { BiometricGateway } from '../users/users.gateway';

export interface AttendanceRecord {
  id: number;
  entry_time: Date;
  exit_time: Date | null;
}

export interface AttendanceDaySummary {
  date: string;
  entries: number;
  exits: number;
  records: AttendanceRecord[];
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Attendance) // <-- Inyecta el repositorio de asistencias
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly biometricGateway: BiometricGateway,
  ) { }

  async processScan(biometricId: number) {
    try {
      // 1. Buscar al usuario por su biometric_id
      const user = await this.userRepository.findOne({
        where: { biometric_id: biometricId },
      });

      if (!user) {
        throw new NotFoundException('Huella no registrada en el sistema');
      }

      // 2. Verificar si tiene una entrada abierta (exit_time es NULL)
      const openRecord = await this.attendanceRepository.findOne({
        where: {
          user_id: user.id,
          exit_time: IsNull(), // Busca un registro de este usuario sin salida
        },
      });

      let scanType = '';

      // 3. Lógica de Entrada vs Salida en Base de Datos
      if (!openRecord) {
        // NO tiene entrada abierta -> Crear nuevo registro (ENTRADA)
        const newAttendance = this.attendanceRepository.create({
          user_id: user.id,
        });
        await this.attendanceRepository.save(newAttendance);
        scanType = 'Entrada';
      } else {
        // SÍ tiene entrada abierta -> Actualizar registro existente (SALIDA)
        openRecord.exit_time = new Date(); // Asigna la hora actual
        await this.attendanceRepository.save(openRecord);
        scanType = 'Salida';
      }

      // 4. Avisar al Frontend (Next.js/React) vía WebSocket
      this.biometricGateway.server.emit('nueva-asistencia', {
        userId: user.id,
        userName: `${user.name} ${user.last_name}`,
        type: scanType,
        timestamp: new Date(),
      });

      // 5. Responder a la Raspberry Pi Pico W para su pantalla OLED
      return {
        userName: user.name,
        type: scanType,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al procesar la asistencia');
    }
  }

  async getAttendanceByUser(
    userId: number,
  ): Promise<ApiResponse<AttendanceDaySummary[]>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const records = await this.attendanceRepository.find({
      where: { user_id: userId },
      order: { entry_time: 'DESC' },
    });

    const byDate = new Map<string, AttendanceRecord[]>();

    for (const r of records) {
      const dateKey = r.entry_time.toISOString().slice(0, 10);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({
        id: r.id,
        entry_time: r.entry_time,
        exit_time: r.exit_time ?? null,
      });
    }

    const data: AttendanceDaySummary[] = Array.from(byDate.entries()).map(
      ([date, dayRecords]) => ({
        date,
        entries: dayRecords.length,
        exits: dayRecords.filter((r) => r.exit_time !== null).length,
        records: dayRecords,
      }),
    );

    return { code: 200, message: 'ok', data };
  }
}