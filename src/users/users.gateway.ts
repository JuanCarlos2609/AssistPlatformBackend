import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

function resolveWsCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') {
    return true;
  }
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

@WebSocketGateway({
  cors: {
    origin: resolveWsCorsOrigin(),
    credentials: true,
  },
})
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
