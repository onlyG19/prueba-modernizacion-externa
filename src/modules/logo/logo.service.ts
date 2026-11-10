import { Inject, Injectable } from '@nestjs/common';
import { join } from 'path';
import { createReadStream, ReadStream, existsSync } from 'fs';
import Redis from 'ioredis';
// [ANTES] import { REDIS_CLIENT } from '../redis/redis.provider';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';

const COUNTER_KEY = 'logo:request:count';

@Injectable()
export class LogoService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async incrementCounter(): Promise<number> {
    return this.redis.incr(COUNTER_KEY);
  }

  async getCounter(): Promise<number> {
    const value = await this.redis.get(COUNTER_KEY);
    return value ? parseInt(value, 10) : 0;
  }

  getLogoStream(): { stream: ReadStream; contentType: string } {
    const pngPath = join(process.cwd(), 'src', 'assets', 'logo.png');
    const svgPath = join(process.cwd(), 'src', 'assets', 'logo.svg');

    if (existsSync(pngPath)) {
      return { stream: createReadStream(pngPath), contentType: 'image/png' };
    }
    return { stream: createReadStream(svgPath), contentType: 'image/svg+xml' };
  }
}
