import { CallHandler, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface ApiResponse<T> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  intercept(_: unknown, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // ✅ If already formatted → return as it is
        if (
          data &&
          typeof data === "object" &&
          "statusCode" in data &&
          "statusMessage" in data
        ) {
          return data as unknown as ApiResponse<T>;
        }

        // ✅ Otherwise wrap it
        return {
          statusCode: 200,
          statusMessage: "Success",
          data,
        };
      }),
    );
  }
}
