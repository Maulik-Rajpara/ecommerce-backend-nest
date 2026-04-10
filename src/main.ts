import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PinoLogger } from 'nestjs-pino';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as express from 'express';

async function bootstrap() {

 const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

  app.use(express.json());

  app.setGlobalPrefix('api/v1');

  
 
  app.useGlobalInterceptors(new ResponseInterceptor()); 
  app.useGlobalFilters(new HttpExceptionFilter());

  

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // 🔥 get queue instance
  const emailQueue = app.get<Queue>(getQueueToken('email'));

  // 🔥 setup bull board
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
  

  app.useGlobalPipes( 
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
 await app.listen(process.env.PORT ?? 3000);
  
    const config = new DocumentBuilder()
      .setTitle('Ecommerce API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}
bootstrap();
