import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse &&
        "message" in exceptionResponse
      ) {
        const rawMessage = exceptionResponse.message;
        message = Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : String(rawMessage);
      } else {
        message = exception.message;
      }
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
        return "BAD_REQUEST";
      case 401:
        return "UNAUTHORIZED";
      case 404:
        return "NOT_FOUND";
      default:
        return "INTERNAL_SERVER_ERROR";
    }
  }
}
