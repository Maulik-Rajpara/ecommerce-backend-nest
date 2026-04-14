import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { NotifcationGateway } from "../gateway/notification.gateway";
import { NotificationService } from "./notification.service";

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: "email",
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
    }),
  ],
  providers: [NotificationService, NotifcationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
