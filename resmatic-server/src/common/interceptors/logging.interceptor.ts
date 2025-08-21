import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  // Use a short context so the prefix is compact: [HTTP]
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const { method } = req;
    const url = (req.originalUrl || req.url || '').toString();
    const start = Date.now();
    const format = (process.env.NEST_LOG_FORMAT || 'short').toLowerCase();

    const build = (status: number, ms: number): string => {
      const length = res.getHeader('content-length');
      const len = typeof length === 'string' ? `${length}b` : Array.isArray(length) ? `${length.join(',')}b` : length ? `${length}b` : '';
      if (format === 'tiny') return `${method} ${url} ${status} ${ms}ms`;
      if (format === 'short') return `${method} ${url} ${status} - ${ms}ms`;
      // full
      return `${method} ${url} ${status} - ${ms}ms${len ? ' ' + len : ''}`;
    };

    return next.handle().pipe(
      tap({
        next: () => {
          // Do nothing here; log on complete for success
        },
        error: (err) => {
          const ms = Date.now() - start;
          const status = (err && (err.status || err.statusCode)) ?? res.statusCode ?? 500;
          this.logger.error(build(status, ms));
        },
        complete: () => {
          const ms = Date.now() - start;
          const status = res.statusCode;
          this.logger.log(build(status, ms));
        },
      }),
    );
  }
}
