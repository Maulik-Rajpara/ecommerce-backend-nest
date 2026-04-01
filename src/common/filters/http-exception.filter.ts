import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { request } from 'https';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
  
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res: any = exception.getResponse();
      message = res?.message || exception.message;
    }

    response.status(status).json({
      statusCode: status,
      errorCode: this.getErrorCode(status),
      errorMessage: message,
      data: null,
    });
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}