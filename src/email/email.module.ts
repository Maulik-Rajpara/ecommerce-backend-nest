import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { EmailProcessor } from "./email.processor";
import { QUEUES } from "src/async/async.constants";

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: QUEUES.EMAIL,
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService, BullModule],
})
export class EmailModule {}
