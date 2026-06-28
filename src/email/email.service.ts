import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

interface MailTransport {
  sendMail(options: {
    from?: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<unknown>;
}

@Injectable()
export class EmailService {
  private transporter: MailTransport;

  constructor(private configService: ConfigService) {
    const transportOptions: SMTPTransport.Options = {
      host: this.configService.get<string>("MAIL_HOST"),
      port: Number(this.configService.get<number>("MAIL_PORT") ?? 587),
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASS"),
      },
    };

    // The nodemailer transport is a vetted library object, but its type surface
    // doesn't play nicely with this repo's strict eslint setup.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.transporter = createTransport(
      transportOptions,
    ) as unknown as MailTransport;
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>("MAIL_FROM"),
      to,
      subject,
      html,
    });
  }
}
