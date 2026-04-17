import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    // Si el body ya viene con nuestra estructura { code, message, data }, lo usamos directo.
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'code' in exceptionResponse
    ) {
      response.status(status).json(exceptionResponse);
      return;
    }

    const message =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? ((exceptionResponse as any).message ?? 'Error inesperado')
        : exception instanceof Error
          ? exception.message
          : 'Error inesperado';

    response.status(status).json({
      code: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      data: null,
    });
  }
}
