import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { EmailModule } from './email/email.module';
import { QueueModule } from './queue/queue.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminModule } from './admin/admin.module';
import { RefundModule } from './refund/refund.module';
import { WebhookModule } from './webhook/webhook.module';
import { NotificationModule } from './notification/notification.module';
import { EventsModule } from './common/events/events.module';
import { EventStoreModule } from './event-store/event-store.module';
import { EventProcessorModule } from './event-processor/event-processor.module';
import { KafkaModule } from './kafka/kafka.module';
import { KafkaConsumerModule } from './kafka/consumers/kafka.consumer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false, // dev only
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',

        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty', // 👈 dev me readable logs
                options: {
                  singleLine: true,
                  colorize: true, 
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,

        // 🔥 request logging
        autoLogging: true,
        genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
        redact: ['req.headers.authorization', 'password'], // 🔥 redact sensitive info

        // 🔥 custom serializers
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  
    ScheduleModule.forRoot(),

    UsersModule,

    AuthModule,
    
    EmailModule,
    
    QueueModule,
    
    ProductModule,
    
    CategoryModule,
    
    CartModule,
    
    OrderModule,
    
    PaymentModule,

    EventEmitterModule.forRoot(),

    AdminModule,

    RefundModule,

    WebhookModule,
   
    NotificationModule,
    
    EventsModule,
    
    EventStoreModule,
    
    EventProcessorModule,
    
    KafkaModule,

    KafkaConsumerModule
    
    
  ],
  controllers: [AppController],
  providers: [AppService,],
})
export class AppModule {}
