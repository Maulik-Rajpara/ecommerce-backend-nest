import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { IncomingMessage, ServerResponse } from "http";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import * as Joi from "joi";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";
import { EmailModule } from "./email/email.module";
import { QueueModule } from "./queue/queue.module";
import { ProductModule } from "./product/product.module";
import { CategoryModule } from "./category/category.module";
import { CartModule } from "./cart/cart.module";
import { OrderModule } from "./order/order.module";
import { PaymentModule } from "./payment/payment.module";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "./admin/admin.module";
import { RefundModule } from "./refund/refund.module";
import { WebhookModule } from "./webhook/webhook.module";
import { NotificationModule } from "./notification/notification.module";
import { EventStoreModule } from "./event-store/event-store.module";
import { EventProcessorModule } from "./event-processor/event-processor.module";
import { KafkaModule } from "./kafka/kafka.module";
import { KafkaConsumerModule } from "./kafka/consumers/kafka.consumer.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
        PORT: Joi.number().default(3000),
        // Database
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASS: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        // Auth
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default("7d"),
        // Redis
        REDIS_HOST: Joi.string().default("localhost"),
        REDIS_PORT: Joi.number().default(6379),
        // Kafka
        KAFKA_BROKERS: Joi.string().default("localhost:9092"),
        KAFKA_CLIENT_ID: Joi.string().default("ecommerce"),
        KAFKA_CONSUMER_GROUP: Joi.string().default("ecommerce-consumer-client-v2"),
        // AWS S3
        AWS_REGION: Joi.string().required(),
        AWS_BUCKET: Joi.string().required(),
        AWS_ACCESS_KEY: Joi.string().required(),
        AWS_SECRET_KEY: Joi.string().required(),
        // Email
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().default(587),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),
        // Razorpay
        RAZORPAY_KEY_ID: Joi.string().required(),
        RAZORPAY_KEY_SECRET: Joi.string().required(),
        RAZORPAY_WEBHOOK_SECRET: Joi.string().required(),
        // CORS
        ALLOWED_ORIGINS: Joi.string().default("http://localhost:3000"),
      }),
      validationOptions: { abortEarly: false },
    }),

    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,   // 60 second window
        limit: 60,    // max 60 requests per window per IP
      },
      {
        name: "auth",
        ttl: 60000,   // 60 second window
        limit: 10,    // stricter: 10 requests/min for login/register
      },
    ]),

    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),

      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false, // dev only
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: "info",

        transport:
          process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty", // 👈 dev me readable logs
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: "SYS:standard",
                },
              }
            : undefined,

        // 🔥 request logging
        autoLogging: true,
        genReqId: (
          req: IncomingMessage & {
            headers: Record<string, string | string[] | undefined>;
          },
        ) => req.headers["x-request-id"] || randomUUID(),
        redact: ["req.headers.authorization", "password"], // 🔥 redact sensitive info

        // 🔥 custom serializers
        serializers: {
          req: (req: IncomingMessage & { method?: string; url?: string }) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: ServerResponse) => ({
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

    AdminModule,

    RefundModule,

    WebhookModule,

    NotificationModule,

    EventStoreModule,

    EventProcessorModule,

    KafkaModule,

    KafkaConsumerModule,

    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
