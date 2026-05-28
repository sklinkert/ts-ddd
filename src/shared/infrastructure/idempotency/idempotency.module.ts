import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IdempotencyOrmEntity } from './idempotency.orm-entity';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyCleanupJob } from './idempotency-cleanup.job';
import { IdempotencyMiddleware } from '../../interface/middleware/idempotency.middleware';

@Module({
  imports: [MikroOrmModule.forFeature([IdempotencyOrmEntity])],
  providers: [IdempotencyService, IdempotencyMiddleware, IdempotencyCleanupJob],
  exports: [IdempotencyService, IdempotencyMiddleware],
})
export class IdempotencyModule {}
