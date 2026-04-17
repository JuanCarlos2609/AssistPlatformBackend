import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class BiometricGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`Dispositivo conectado: ${client.id}`);
  }
  // Método para avisar a la Pico W que empiece a escanear
  emitirOrdenRegistro(userId: number) {
    this.server.emit('pico:iniciar_registro', { userId });
  }

  // Método para avisar al Front que el registro terminó
  notificarExitoAlFront(data: any) {
    this.server.emit('front:registro_completo', data);
  }
}
