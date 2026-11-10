import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LogoService } from './logo.service';

@Controller('logo')
export class LogoController {
  constructor(private readonly logoService: LogoService) {}

  /**
   * GET /logo
   * Devuelve la imagen del logo UNO AFP e incrementa el contador de visitas en Redis.
   */
  @Get()
  async getLogo(@Res() res: Response): Promise<void> {
    const count = await this.logoService.incrementCounter();
    const { stream, contentType } = this.logoService.getLogoStream();

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Request-Count', count.toString());

    stream.pipe(res);
  }

  /**
   * GET /logo/count
   * Devuelve el contador actual de solicitudes almacenado en Redis.
   */
  @Get('count')
  async getCount(): Promise<{ count: number }> {
    const count = await this.logoService.getCounter();
    return { count };
  }
}
