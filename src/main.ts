import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueueToken } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as express from "express";
import { Transport } from "@nestjs/microservices";
import { QUEUES } from "./async/async.constants";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use(
    "/api/v1/webhook/razorpay",
    express.raw({ type: "application/json" }),
  );

  app.use(express.json());

  app.setGlobalPrefix("api/v1");

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  // 🔥 get queue instance
  const emailQueue = app.get<Queue>(getQueueToken(QUEUES.EMAIL));
  const orderExpiryQueue = app.get<Queue>(getQueueToken(QUEUES.ORDER_EXPIRY));
  const paymentRetryQueue = app.get<Queue>(getQueueToken(QUEUES.PAYMENT_RETRY));
  const refundRetryQueue = app.get<Queue>(getQueueToken(QUEUES.REFUND_RETRY));

  // 🔥 setup bull board
  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(orderExpiryQueue),
      new BullMQAdapter(paymentRetryQueue),
      new BullMQAdapter(refundRetryQueue),
    ],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? "ecommerce",
        brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
      },
      consumer: {
        groupId:
          process.env.KAFKA_CONSUMER_GROUP ?? "ecommerce-consumer-client-v2",
      },
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);

  const config = new DocumentBuilder()
    .setTitle("Ecommerce API")
    .setDescription("API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
}
void bootstrap();
