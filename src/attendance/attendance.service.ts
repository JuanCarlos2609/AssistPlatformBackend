import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm'; // <-- Importa IsNull
import { User } from '../users/entities/user.entity';
import { Attendance } from './entities/attendance.entity'; // <-- Importa la entidad
import { BiometricGateway } from '../users/users.gateway';

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
      console.error(error); // Útil para ver qué falló en la consola
      throw new InternalServerErrorException('Error al procesar la asistencia');
    }
  }
}