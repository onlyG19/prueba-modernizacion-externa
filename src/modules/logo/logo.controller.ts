// [ANTES] import { Controller, Get, Res } from '@nestjs/common';
import { Controller, Get, Res, StreamableFile } from '@nestjs/common';
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
  // [ANTES] async getLogo(@Res() res: Response): Promise<void> {
  async getLogo(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const count = await this.logoService.incrementCounter();
    // [ANTES] const { stream, contentType } = this.logoService.getLogoStream();
    const { content, contentType } = this.logoService.getLogo();

    // [ANTES] res.setHeader('Content-Type', contentType);
    res.setHeader('X-Request-Count', count.toString());

    // [ANTES] stream.pipe(res);
    return new StreamableFile(content, {
      type: contentType,
      length: content.length,
    });
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
