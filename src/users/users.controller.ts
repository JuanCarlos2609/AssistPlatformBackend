import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UsersService } from './users.service';
import { BiometricGateway } from './users.gateway'; // 1. Importa tu Gateway

@Controller('users')
export class UsersController {
  // 2. Inyecta el BiometricGateway en el constructor
  constructor(
    private readonly usersService: UsersService,
    private readonly biometricGateway: BiometricGateway,
  ) { }

  @Get()
  @HttpCode(200)
  findAll(@Query() query: GetUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @HttpCode(201) // Cambiado a 201 porque es creación
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  // --- NUEVOS ENDPOINTS PARA EL BIOMÉTRICO ---

  // Paso 2: El Front llama aquí para activar el sensor
  @Patch(':id/activar-sensor')
  @HttpCode(200)
  async activarSensor(@Param('id') id: string) {
    this.usersService.setPendingRegistro(+id);
    this.biometricGateway.emitirOrdenRegistro(+id);
    return { message: 'Orden enviada a la Raspberry Pi Pico W' };
  }

  // Paso 3: La Pico W consulta aquí por polling para saber si hay registro pendiente
  @Get('status-registro')
  @HttpCode(200)
  getStatusRegistro() {
    return this.usersService.getStatusRegistro();
  }

  // Paso 4: La Pico W llama aquí para guardar el ID final en la BD
  @Patch(':id/vincular-huella')
  @HttpCode(200)
  async vincularHuella(
    @Param('id') id: string,
    @Body() body: { biometric_id: number },
  ) {
    // Actualizamos al usuario en la base de datos
    const userUpdated = await this.usersService.update(+id, {
      biometric_id: body.biometric_id,
    });

    // Opcional: Le avisamos al Frontend por Sockets que ya quedó listo
    this.biometricGateway.notificarExitoAlFront({
      userId: id,
      biometricId: body.biometric_id,
      success: true,
    });

    return userUpdated;
  }
}
