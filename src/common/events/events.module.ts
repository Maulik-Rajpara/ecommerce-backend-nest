import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { OrderModule } from 'src/order/order.module';
import { UsersModule } from 'src/users/users.module';
import { BullModule } from '@nestjs/bullmq';



@Module({
  imports: [
    BullModule.registerQueue({
          name: 'email',
        }),
    EventEmitterModule.forRoot(), 
    OrderModule,
    UsersModule// 🔥 important
  ],
  providers: [
  
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}