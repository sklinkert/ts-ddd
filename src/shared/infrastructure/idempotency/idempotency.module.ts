import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdempotencyOrmEntity } from './idempotency.orm-entity';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyMiddleware } from '../../interface/middleware/idempotency.middleware';

@Module({
  imports: [MikroOrmModule.forFeature([IdempotencyOrmEntity])],
  providers: [IdempotencyService, IdempotencyMiddleware],
  exports: [IdempotencyService, IdempotencyMiddleware],
})
export class IdempotencyModule {}
