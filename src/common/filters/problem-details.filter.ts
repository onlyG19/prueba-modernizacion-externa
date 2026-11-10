import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ProblemDetailsDto } from '../dto/problem-details.dto';

/** Mensaje de un error inesperado: no expone detalles internos. */
export const DETALLE_ERROR_INTERNO =
  'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

/** Mensaje de un 400 de validación; las reglas incumplidas van en `errors`. */
export const DETALLE_VALIDACION = 'La solicitud tiene datos inválidos.';

/**
 * Convierte cualquier excepción en una respuesta Problem Details (RFC 9457).
 *
 * @remarks
 * Se registra como `APP_FILTER`: aplica a toda la API, también en los tests
 * que levantan la app desde `AppModule`. Los errores inesperados (que no son
 * `HttpException`) se registran en el log con su traza y responden un 500
 * genérico, sin filtrar detalles internos al cliente.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Error inesperado en ${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const problema = aProblemDetails(exception, request.path);
    response
      .status(problema.status)
      .type('application/problem+json')
      .json(problema);
  }
}

/** Traduce una excepción al cuerpo Problem Details. */
export function aProblemDetails(
  exception: unknown,
  instance: string,
): ProblemDetailsDto {
  if (!(exception instanceof HttpException)) {
    return problema(
      HttpStatus.INTERNAL_SERVER_ERROR,
      DETALLE_ERROR_INTERNO,
      instance,
    );
  }

  const status = exception.getStatus();
  const cuerpo = exception.getResponse();
  const mensaje =
    typeof cuerpo === 'string'
      ? cuerpo
      : (cuerpo as { message?: unknown }).message;

  // El ValidationPipe entrega una lista: una entrada por regla incumplida.
  if (Array.isArray(mensaje)) {
    return {
      ...problema(status, DETALLE_VALIDACION, instance),
      errors: mensaje.map(String),
    };
  }
  return problema(
    status,
    typeof mensaje === 'string' ? mensaje : exception.message,
    instance,
  );
}

function problema(
  status: number,
  detail: string,
  instance: string,
): ProblemDetailsDto {
  return {
    type: 'about:blank',
    title: STATUS_CODES[status] ?? 'Error',
    status,
    detail,
    instance,
  };
}
