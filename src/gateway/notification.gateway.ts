import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotifcationGateway {
  @WebSocketServer()
  server: Server;

  // user connect hone pe room join karega
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, userId: string) {
    client.join(userId);
    console.log(`👤 User joined room: ${userId}`);
  }

  notifyUser(userId: string, data: any) {
    this.server.to(userId).emit(data.type, data.payload);
  }
}