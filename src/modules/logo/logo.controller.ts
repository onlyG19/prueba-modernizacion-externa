// [ANTES] import { Controller, Get, Res } from '@nestjs/common';
// [ANTES] import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
import { Controller, Get, Header, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { LogoService } from './logo.service';
import { VisitCounterService } from './visit-counter.service';
import {
  ApiOkResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { LIMITE_LOGO } from '../../config/limites';
// [ANTES] import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ProblemDetailsDto } from '../../common/dto/problem-details.dto';
import { VisitCountDto } from './dto/visit-count.dto';

@Public()
@Controller('logo')
export class LogoController {
  // [ANTES] constructor(private readonly logoService: LogoService) {}
  constructor(
    private readonly logoService: LogoService,
    private readonly visitCounter: VisitCounterService,
  ) {}

  /**
   * Devuelve la imagen del logo e incrementa el contador de visitas.
   *
   * @remarks Efecto secundario a propósito: este GET suma una visita, así que
   * no es idempotente. Por eso `Cache-Control: no-store`: un caché (navegador,
   * proxy o CDN) que lo sirviera sin consultar a la API se comería visitas. Si
   * Redis no está disponible, igual devuelve el logo, sin `X-Request-Count`.
   */
  @ApiProduces('image/svg+xml', 'image/png')
  @ApiOkResponse({
    description: 'La imagen del logo',
    schema: { type: 'string', format: 'binary' },
    headers: {
      'X-Request-Count': {
        description:
          'Total de visitas, incluida esta. Se omite si Redis no está disponible.',
        schema: { type: 'integer', example: 42 },
      },
    },
  })
  // Cada petición suma una visita: un límite propio evita inflar el contador.
  @Throttle({ default: LIMITE_LOGO })
  @Header('Cache-Control', 'no-store')
  @Get()
  // [ANTES] async getLogo(@Res() res: Response): Promise<void> {
  async getLogo(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // [ANTES] const count = await this.logoService.incrementCounter();
    const count = await this.visitCounter.increment();
    // [ANTES] const { stream, contentType } = this.logoService.getLogoStream();
    const { content, contentType } = this.logoService.getLogo();

    // [ANTES] res.setHeader('Content-Type', contentType);
    // [ANTES] res.setHeader('X-Request-Count', count.toString());
    if (count !== null) {
      res.setHeader('X-Request-Count', count.toString());
    }

    // [ANTES] stream.pipe(res);
    return new StreamableFile(content, {
      type: contentType,
      length: content.length,
    });
  }

  // [ANTES] /** Devuelve el total de visitas al logo. */
  /** Total de visitas al logo (el recurso `visitas` del logo). Solo lee. */
  @ApiServiceUnavailableResponse({
    description: 'Redis no está disponible',
    type: ProblemDetailsDto,
  })
  // [ANTES] @Get('count')
  @Get('visitas')
  // El total cambia con cada visita: siempre se consulta a la API.
  @Header('Cache-Control', 'no-store')
  // [ANTES] async getCount(): Promise<{ count: number }> {
  async getCount(): Promise<VisitCountDto> {
    // [ANTES] const count = await this.logoService.getCounter();
    const count = await this.visitCounter.getCount();
    return { count };
  }
}
