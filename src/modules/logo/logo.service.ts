// [ANTES] import { Inject, Injectable } from '@nestjs/common';
// [ANTES] import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
// [ANTES] import { createReadStream, ReadStream, existsSync } from 'fs';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
// [ANTES] import Redis from 'ioredis';
// [ANTES] import { REDIS_CLIENT } from '../redis/redis.provider';
// [ANTES] import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';

// [ANTES] const COUNTER_KEY = 'logo:request:count';

/**
 * Carpeta del logo, resuelta respecto de este archivo (no del directorio desde
 * donde se arranca la app). `nest build` la copia a `dist` (ver `assets` en
 * nest-cli.json).
 */
export const LOGO_ASSETS_DIR = join(__dirname, 'assets');

/** Formatos aceptados para el logo, en orden de preferencia. */
const LOGO_FORMATS = [
  { file: 'logo.png', contentType: 'image/png' },
  { file: 'logo.svg', contentType: 'image/svg+xml' },
];

/** Logo listo para enviarse en una respuesta HTTP. */
export interface Logo {
  content: Buffer;
  contentType: string;
}

@Injectable()
export class LogoService implements OnModuleInit {
  private logo!: Logo;

  // [ANTES] constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Carga el logo en memoria al iniciar el módulo, una sola vez.
   *
   * @throws Error Si no existe ningún archivo de logo: la app no arranca sin él.
   */
  async onModuleInit(): Promise<void> {
    this.logo = await this.loadLogo();
  }

  // [ANTES] async incrementCounter(): Promise<number> {
  // [ANTES]   return this.redis.incr(COUNTER_KEY);
  // [ANTES] }
  // [ANTES]
  // [ANTES] async getCounter(): Promise<number> {
  // [ANTES]   const value = await this.redis.get(COUNTER_KEY);
  // [ANTES]   return value ? parseInt(value, 10) : 0;
  // [ANTES] }

  // [ANTES] getLogoStream(): { stream: ReadStream; contentType: string } {
  // [ANTES]   const pngPath = join(process.cwd(), 'src', 'assets', 'logo.png');
  // [ANTES]   const svgPath = join(process.cwd(), 'src', 'assets', 'logo.svg');
  // [ANTES]
  // [ANTES]   if (existsSync(pngPath)) {
  // [ANTES]     return { stream: createReadStream(pngPath), contentType: 'image/png' };
  // [ANTES]   }
  // [ANTES]   return { stream: createReadStream(svgPath), contentType: 'image/svg+xml' };
  // [ANTES] }

  /** Devuelve el logo cargado al iniciar el módulo. */
  getLogo(): Logo {
    return this.logo;
  }

  private async loadLogo(): Promise<Logo> {
    for (const { file, contentType } of LOGO_FORMATS) {
      const path = join(LOGO_ASSETS_DIR, file);
      if (existsSync(path)) {
        return { content: await readFile(path), contentType };
      }
    }
    throw new Error(
      `No se encontró el logo (logo.png o logo.svg) en ${LOGO_ASSETS_DIR}`,
    );
  }
}
