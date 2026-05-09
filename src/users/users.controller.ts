import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UsersService } from './users.service';
import { BiometricGateway } from './users.gateway';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly biometricGateway: BiometricGateway,
  ) { }

  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  findAll(@Query() query: GetUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
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

  // --- ENDPOINTS PARA BORRADO CON COLA DE TAREAS ---

  // El Admin solicita eliminar a un usuario
  @Delete(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(+id);
  }

  // La Pico W pregunta si hay alguna huella pendiente de borrado
  @Get('status-borrado')
  @HttpCode(200)
  getStatusBorrado() {
    return this.usersService.getStatusBorrado();
  }

  // La Pico W avisa que ya borró la huella del sensor físico
  @Post('confirmar-borrado')
  @HttpCode(200)
  async confirmarBorrado(@Body() body: { slot: number }) {
    return this.usersService.confirmarBorrado(body.slot);
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
