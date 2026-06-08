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

// UTC-6 (America/Mexico_City sin horario de verano).
// Usamos offset fijo para no depender de librerías externas en el servidor.
const MEXICO_OFFSET_MS = -6 * 60 * 60 * 1000;

/** Devuelve la fecha en zona horaria de México como string "YYYY-MM-DD". */
function toMexicoDateStr(date: Date): string {
  const local = new Date(date.getTime() + MEXICO_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

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
      // 1. Buscar al usuario activo por su biometric_id
      const user = await this.userRepository.findOne({
        where: { biometric_id: biometricId, status: 'A', is_pending_deletion: false },
      });

      if (!user) {
        throw new NotFoundException('Huella no registrada en el sistema');
      }

      // 2. Verificar si tiene una entrada abierta (exit_time es NULL)
      const openRecord = await this.attendanceRepository.findOne({
        where: {
          user_id: user.id,
          exit_time: IsNull(),
        },
      });

      let scanType = '';
      const now = new Date();
      const todayStr = toMexicoDateStr(now);

      // 3. Lógica de Entrada vs Salida en Base de Datos
      if (!openRecord) {
        // NO tiene entrada abierta -> Crear nuevo registro (ENTRADA)
        const newAttendance = this.attendanceRepository.create({
          user_id: user.id,
        });
        await this.attendanceRepository.save(newAttendance);
        scanType = 'Entrada';
      } else {
        const entryDateStr = toMexicoDateStr(openRecord.entry_time);
        const isFromPreviousDay = entryDateStr < todayStr;

        if (isFromPreviousDay) {
          // El registro abierto es de un día anterior:
          // 1. Cerrarlo automáticamente al final de ese día (23:59:59)
          const endOfEntryDay = new Date(openRecord.entry_time);
          endOfEntryDay.setHours(23, 59, 59, 0);
          openRecord.exit_time = endOfEntryDay;
          await this.attendanceRepository.save(openRecord);

          // 2. Crear una nueva ENTRADA para hoy
          const newAttendance = this.attendanceRepository.create({
            user_id: user.id,
          });
          await this.attendanceRepository.save(newAttendance);
          scanType = 'Entrada';
        } else {
          // El registro abierto es del mismo día -> SALIDA normal
          openRecord.exit_time = now;
          await this.attendanceRepository.save(openRecord);
          scanType = 'Salida';
        }
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
      const dateKey = toMexicoDateStr(r.entry_time);
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