import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerModule } from './kafka.producer.module';

import { KafkaService } from './kafka.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'ecommerce',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'ecommerce-consumer-client-v2',
          },
        },
      },
    ]),
  ],
  providers: [KafkaService],
  exports: [ClientsModule,KafkaService ],
})
export class KafkaModule {}