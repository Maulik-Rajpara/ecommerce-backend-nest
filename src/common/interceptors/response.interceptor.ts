import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        // ✅ If already formatted → return as it is
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'statusMessage' in data
        ) {
          return data;
        }

        // ✅ Otherwise wrap it
        return {
          statusCode: 200,
          statusMessage: 'Success',
          data,
        };
      }),
    );
  }
}