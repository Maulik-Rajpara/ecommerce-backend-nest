import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";

interface JoinPayload {
  token: string;
}

interface NotificationEvent {
  type: string;
  payload: Record<string, unknown>;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class NotifcationGateway {
  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage("join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    try {
      const token = payload.token?.replace(/^Bearer\s+/i, "");
      const user = await this.jwtService.verifyAsync<{ sub: string }>(token);
      await client.join(user.sub);
      return { joined: true };
    } catch {
      throw new WsException("Unauthorized socket connection");
    }
  }

  notifyUser(userId: string, data: NotificationEvent) {
    this.server.to(userId).emit(data.type, data.payload);
  }
}
