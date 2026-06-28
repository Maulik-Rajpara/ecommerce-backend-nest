import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";

import { KafkaService } from "./kafka.service";

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: "KAFKA_SERVICE",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId:
                configService.get<string>("KAFKA_CLIENT_ID") ?? "ecommerce",
              brokers: (
                configService.get<string>("KAFKA_BROKERS") ?? "localhost:9092"
              ).split(","),
              retry: {
                initialRetryTime: 1000,
                retries: 10,
              },
            },
            consumer: {
              groupId:
                configService.get<string>("KAFKA_CONSUMER_GROUP") ??
                "ecommerce-consumer-client-v2",
              sessionTimeout: 30000,
              heartbeatInterval: 3000,
            },
          },
        }),
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [ClientsModule, KafkaService],
})
export class KafkaModule {}
